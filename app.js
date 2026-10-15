// VoiceLearn prototype: browser Web Speech API (speechSynthesis + SpeechRecognition).
// Goal: prove the voice loop (listen -> command -> answer -> dictate -> read back -> submit). Not production code.
(() => {
  const C = window.COURSE;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- persistent state (this device only) ----------
  const KEY = "voicelearn.v1";
  const fresh = () => ({ pos: { l: 0, s: 0, sent: 0 }, done: {}, answers: {}, drafts: {}, rate: 1, auto: true, lang: "en-US", checkpoints: true, aliases: {} });
  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { S = fresh(); }
  // Old or partially written device data must not prevent the controls from loading.
  for (const key of ["done", "answers", "drafts"]) if (!S[key] || typeof S[key] !== "object" || Array.isArray(S[key])) S[key] = {};
  S.rate = [0.75, 1, 1.25, 1.5, 1.75, 2].includes(S.rate) ? S.rate : 1;
  S.auto = S.auto !== false;
  const LANGS = { 'en-US': 'English (US)', 'en-GB': 'English (UK)', 'en-IN': 'English (India)', 'en-AU': 'English (Australia)', 'en-CA': 'English (Canada)' };
  if (!Object.hasOwn(LANGS, S.lang)) S.lang = 'en-US';
  S.checkpoints = S.checkpoints !== false;
  if (!S.aliases || typeof S.aliases !== 'object' || Array.isArray(S.aliases)) S.aliases = {};
  const PRACTICE = { BACK: 'go back', NEXT: 'next section', CONTINUE: 'continue learning', REPEAT: 'repeat section', PAUSE: 'pause lesson' };
  S.aliases = Object.fromEntries(Object.entries(S.aliases).filter(([text, intent]) => /^[a-z0-9' ]{2,60}$/.test(text) && Object.hasOwn(PRACTICE, intent)));
  const p = S.pos || {};
  const l = Number.isInteger(p.l) && C.lessons[p.l] ? p.l : 0;
  const s = Number.isInteger(p.s) && C.lessons[l].sections[p.s] ? p.s : 0;
  S.pos = { l, s, sent: Number.isInteger(p.sent) && p.sent >= 0 ? p.sent : 0 };
  let storageFailed = false;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); storageFailed = false; } catch (e) { storageFailed = true; } };

  // ---------- runtime state ----------
  const R = { view: "home", phase: "idle", act: null, flow: 0, action: 0, spk: 0, rec: null, confirm: null, interim: "", dictFailures: 0 };
  let lastStatus = "", speechQuietUntil = 0;
  // phase: idle | playing | paused | speaking | listening | dictating | finishing

  // ---------- helpers ----------
  const lesson = (l) => C.lessons[l];
  const findAct = (id) => { for (let l = 0; l < C.lessons.length; l++) { const a = lesson(l).activities.findIndex((x) => x.id === id); if (a >= 0) return { l, a }; } };
  const actOf = (r) => lesson(r.l).activities[r.a];
  const draft = (id) => {
    const d = S.drafts[id];
    if (!d || !Array.isArray(d.paras) || !d.paras.length || !d.paras.every((p) => typeof p === "string"))
      S.drafts[id] = { paras: [""], saved: 0, submitted: 0 };
    return S.drafts[id];
  };
  const draftText = (d) => d.paras.map((p) => p.trim()).filter(Boolean).join("\n\n");
  const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);
  const sentences = (t) => (t.match(/[^.!?]+[.!?]+["')]*|\S[^.!?]*$/g) || []).map((x) => x.trim()).filter(Boolean);
  const norm = (t) => t.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  const L = "ABCD";

  // ---------- audio cues ----------
  let ac;
  function chime(f = 880, ms = 110) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume().catch(() => {});
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(0.15, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + ms / 1000);
      o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + ms / 1000);
    } catch (e) {}
  }

  // ---------- speech output ----------
  const synth = window.speechSynthesis;
  let speechCleanup = null, utterance = null;
  function voice() {
    const vs = synth.getVoices().filter((v) => /^en(?:-|$)/i.test(v.lang));
    return vs.find((v) => v.localService && v.default) || vs.find((v) => v.localService) || vs.find((v) => v.default) || vs[0];
  }
  function stopSpeech() {
    R.spk++;
    if (synth && (synth.speaking || synth.pending)) speechQuietUntil = Date.now() + 250;
    const cleanup = speechCleanup; speechCleanup = null; if (cleanup) cleanup();
    if (synth) synth.cancel();
    utterance = null;
  }
  // Keep each utterance short, even for an unpunctuated dictated paragraph.
  // Retain the original sentence index for highlighting and resume.
  function speechParts(list) {
    return list.flatMap((text, index) => {
      const parts = []; let rest = text.trim();
      while (rest.length > 180) {
        let cut = rest.lastIndexOf(' ', 180); if (cut < 1) cut = 180;
        parts.push({ text: rest.slice(0, cut), index }); rest = rest.slice(cut).trim();
      }
      if (rest) parts.push({ text: rest, index });
      return parts;
    });
  }
  function speechFailure(message) {
    R.flow++; stopRec(); stopSpeech(); R.phase = 'paused';
    releaseWake();
    render(); status(message + ' Tap Play to retry, or use Talk / typed commands.');
  }
  function speakList(list, onSentence, onDone) {
    stopRec();
    stopSpeech(); const tok = R.spk;
    if (!synth || !window.SpeechSynthesisUtterance) return speechFailure('Speech output is unavailable.');
    keepAwake();
    const parts = speechParts(list); let i = 0, retries = 0;
    const next = () => {
      if (tok !== R.spk) return;
      if (i >= parts.length) { speechCleanup = null; utterance = null; return onDone && onDone(); }
      const part = parts[i], u = new SpeechSynthesisUtterance(part.text);
      utterance = u; // Some engines lose events if the utterance is garbage collected.
      const v = voice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
      u.rate = S.rate;
      onSentence && onSentence(part.index);
      let done = false, started = false, idleSince = 0;
      const queuedAt = Date.now();
      const cleanup = () => { done = true; clearInterval(dog); u.onstart = u.onend = u.onerror = null; if (speechCleanup === cleanup) speechCleanup = null; };
      const finish = () => { if (done || tok !== R.spk) return; cleanup(); speechQuietUntil = Date.now() + 250; i++; retries = 0; next(); };
      const retry = () => {
        if (done || tok !== R.spk) return;
        cleanup(); synth.cancel();
        if (retries++ < 1) {
          const timer = setTimeout(() => { speechCleanup = null; next(); }, 200);
          speechCleanup = () => clearTimeout(timer);
        } else speechFailure('Speech stopped responding. Your place is saved.');
      };
      const dog = setInterval(() => {
        if (done || tok !== R.spk) return cleanup();
        if (document.hidden) return;
        if (synth.paused) synth.resume();
        // Only recover a lost end event after speech actually started.
        if (started && !synth.speaking && !synth.pending) {
          if (!idleSince) idleSince = Date.now();
          if (Date.now() - idleSince > 1000) return finish();
        } else idleSince = 0;
        // A stuck engine is retried at the SAME chunk, never silently skipped.
        const limit = started ? Math.max(15000, part.text.length * 130 / S.rate + 5000) : 10000;
        if (Date.now() - queuedAt > limit) retry();
      }, 500);
      speechCleanup = cleanup;
      u.onstart = () => { started = true; };
      u.onend = finish;
      u.onerror = (e) => {
        if (done || tok !== R.spk) return;
        if (e.error === 'not-allowed') { cleanup(); speechFailure('Tap Play to allow speech on this browser.'); }
        else retry();
      };
      try { if (synth.paused) synth.resume(); synth.speak(u); } catch (e) { retry(); }
    };
    const begin = () => {
      if (tok !== R.spk) return;
      const delay = speechQuietUntil - Date.now();
      if (delay > 0) {
        const timer = setTimeout(() => { speechCleanup = null; next(); }, delay);
        speechCleanup = () => clearTimeout(timer);
      } else next();
    };
    // Releasing microphone audio focus is asynchronous on mobile.
    if (recClosing) recClosing.then(begin); else begin();
  }

  // A screen lock is best effort and applies only while this page is visible.
  let wake = null, wakePending = false, wakeWanted = false, wakeWarning = '';
  async function keepAwake() {
    wakeWanted = true;
    if (document.hidden || wake || wakePending) return;
    if (!navigator.wakeLock) { wakeWarning = 'Screen lock unavailable; keep the screen on.'; status(lastStatus); return; }
    wakePending = true;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (!wakeWanted || document.hidden) { await lock.release(); return; }
      wake = lock; wakeWarning = '';
      lock.addEventListener('release', () => {
        if (wake === lock) { wake = null; if (wakeWanted) wakeWarning = 'Screen lock released; keep the screen on.'; status(lastStatus); }
      });
    } catch (e) { wakeWarning = 'Could not keep the screen awake; keep it on manually.'; }
    finally { wakePending = false; status(lastStatus); }
  }
  function releaseWake() {
    wakeWanted = false; wakeWarning = '';
    const lock = wake; wake = null;
    if (lock) lock.release().catch(() => {});
  }
  function suspendPage() {
    if (!['playing', 'speaking', 'listening', 'dictating', 'finishing'].includes(R.phase)) return;
    const wasDictating = ['dictating', 'finishing'].includes(R.phase);
    R.action++; R.flow++; stopRec(); stopSpeech(); R.interim = ''; R.phase = 'paused'; save(); render();
    status(wasDictating ? 'Dictation paused. Final words saved; unfinished words may need repeating. Tap Start my answer.' : 'Paused while the app is hidden. Tap Play or Talk to continue.');
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { suspendPage(); return; }
    if (wakeWanted) keepAwake();
  });
  window.addEventListener('pagehide', () => { suspendPage(); releaseWake(); save(); });
  // Interrupted promises do not continue their old flow; all continuations check R.flow.
  const say = (text) => new Promise((res) => { status('Speaking…'); speakList(sentences(text), null, res); });

  // ---------- UI ----------
  function status(t) { lastStatus = t; $("status").textContent = t + (storageFailed ? " Storage unavailable: this session may not be saved." : "") + (wakeWarning ? " " + wakeWarning : ""); }
  function heard(t) { $("heard").textContent = t ? "Heard: “" + t + "”" : ""; }
  function dock() {
    const t = $("talk");
    t.className = "talk" + (R.phase === "listening" ? " live" : R.phase === "dictating" ? " dict" : "");
    t.textContent = R.phase === "listening" ? "…" : R.phase === "dictating" ? "STOP" : "TALK";
    t.disabled = R.phase === "finishing";
    t.setAttribute("aria-label", R.phase === "dictating" ? "Stop dictation" : R.phase === "listening" ? "Stop listening" : "Talk");
    $("bPlay").textContent = R.phase === "playing" ? "⏸ Pause" : "▶ Play";
    $("bRate").textContent = S.rate.toFixed(2).replace(/0$/, "") + "×";
    $("autoL").checked = S.auto;
  }

  function render() {
    const m = $("main");
    document.body.dataset.view = R.view;
    if (R.view === "home") m.innerHTML = homeView();
    else if (R.view === "player") { m.innerHTML = playerView(); attachStage(false); }
    else if (R.view === "activity") m.innerHTML = activityView();
    else if (R.view === "setup") m.innerHTML = setupView();
    dock();
    bindView();
  }

  function lessonState(l) {
    const L_ = lesson(l);
    if (S.done[L_.id]) return '<span class="pill done">Done</span>';
    if (S.pos.l === l) return '<span class="pill now">In progress</span>';
    return '<span class="pill">Not started</span>';
  }

  function homeView() {
    const p = S.pos, Lc = lesson(p.l), sec = Lc.sections[Math.min(p.s, Lc.sections.length - 1)];
    const doneN = C.lessons.filter((x) => S.done[x.id]).length;
    return `
    <div class="card"><h2>Ready for hands-free learning?</h2><div>First, check your voice while stationary. During lessons, wait for “Your turn” and the listening tone before speaking. The mic is off during narration. Tap Talk to interrupt.</div><button class="primary" id="setupHome">Check my voice</button><div class="muted">Keep this page visible and the screen on. Browser recognition may use an online service. Use while safely seated or travelling as a passenger.</div></div>
    <div class="card">
      <div class="eyebrow">Continue learning</div>
      <h1>Lesson ${p.l + 1}: ${esc(Lc.title)}</h1>
      <div class="muted">${esc(sec.title)} · ${doneN} of ${C.lessons.length} lessons done</div>
      <div class="row"><button class="primary" data-go="resume">▶ Continue</button><button data-go="reset">Start over</button></div>
    </div>
    <div class="card">
      <div class="eyebrow">${esc(C.code)} · ${esc(C.subtitle)}</div>
      <h2>${esc(C.title)}</h2>
      <div>${C.lessons.map((x, l) => `
        <div class="lesson"><div style="min-width:0"><b>${l + 1}. ${esc(x.title)}</b><div class="muted" style="font-size:15px">${x.sections.length} sections · ${x.activities.map((a) => typeName(a.type)).join(", ")}</div></div>
        <div class="row">${lessonState(l)}<button data-play="${l}">Play</button></div></div>`).join("")}
      </div>
    </div>
    <div class="card">
      <div class="eyebrow">Try saying</div>
      <div class="chips">${["continue learning", "pause", "repeat", "next", "next lesson", "read the question", "option B", "start my answer", "new paragraph", "stop dictation", "read my answer", "save my answer", "submit my assignment", "faster", "where am I"].map((c) => `<span>${c}</span>`).join("")}</div>
    </div>`;
  }

  function setupView() {
    return `<div class="card"><h1>Check my voice</h1>
      <p>Choose the English variety closest to your speech and test it with your usual headset. This saves command corrections on this device; it cannot train Chrome's speech engine or store a voice model. Audio is handled by your browser's speech service and may leave the device.</p>
      <label>Recognition language <select id="speechLang">${Object.entries(LANGS).map(([code, label]) => `<option value="${code}" ${S.lang === code ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <label><input type="checkbox" id="checkpoints" ${S.checkpoints ? 'checked' : ''}> Offer a voice turn about every three sentences</label>
      <div>Choose a command, wait for the tone, then say the phrase. Nothing will navigate during this check. Try “back” as well as “go back”.</div>
      <div class="row">${Object.entries(PRACTICE).map(([intent, text]) => `<button data-practice="${intent}">Test: ${text}</button>`).join('')}</div>
      <div id="practiceResult" role="status">${R.practiceMessage || 'Choose a command to begin.'}</div>
      ${R.candidate ? `<button id="saveAlias" class="primary">Use “${esc(R.candidate.text)}” for “${PRACTICE[R.candidate.intent]}”</button>` : ''}
      <div>Saved corrections: ${Object.entries(S.aliases).map(([text, intent]) => esc(text) + ' → ' + PRACTICE[intent]).join('; ') || 'none'}</div>
      <div class="row"><button id="clearAliases">Forget corrections</button><button id="leaveSetup" class="primary">Done</button></div></div>`;
  }
  function openSetup() { stopAll(); R.view = 'setup'; R.candidate = null; R.practiceMessage = ''; render(); status('Choose a language and test a command.'); }
  async function practice(intent) {
    stopAll(); R.candidate = null; R.practiceMessage = ''; render();
    const flow = R.flow; R.phase = 'speaking'; dock();
    await say('After the tone, say ' + PRACTICE[intent] + '.');
    if (flow !== R.flow) return;
    listen(9000, () => status('No speech received. Choose the command to try again.'), (alts) => {
      const text = norm(alts[0]);
      const known = commandIntent(text);
      if (known === intent) R.practiceMessage = 'Understood “' + esc(alts[0]) + '”. Ready to use.';
      else if (!text || text.length > 60 || known || /^(yes|no|confirm|cancel|submit|save)$/.test(text)) R.practiceMessage = 'Heard “' + esc(alts[0]) + '”. Try the longer phrase “' + PRACTICE[intent] + '” or a different language. This correction would conflict with another command.';
      else { R.candidate = { text, intent }; R.practiceMessage = 'Heard “' + esc(alts[0]) + '”. Save this only if it is how Chrome repeatedly hears your command. Test again to verify it.'; }
      render(); status('Voice check complete. Review the result or test again.');
    });
  }

  function typeName(t) { return { mcq: "quiz", short: "short answer", reflection: "spoken reflection", essay: "essay" }[t]; }

  function playerView() {
    const p = S.pos, Lc = lesson(p.l), sec = Lc.sections[p.s];
    const sents = sentences(sec.script);
    return `
    <div class="player">
      <div id="stageSlot"></div>
      ${R.phase === "paused" ? `<button class="primary resume" data-go="resume" aria-label="Resume ${esc(sec.title)}">▶ Resume</button>` : ""}
    </div>
    <div class="cc" id="cc" aria-live="off">${esc(sents[Math.min(p.sent, sents.length - 1)] || "")}</div>`;
  }

  // The animated stage persists across re-renders so its build-up isn't lost on pause.
  const stageEl = document.createElement("div");
  if (window.Scenes) Scenes.mount(stageEl);
  function attachStage(force) {
    const slot = $("stageSlot"); if (!slot || !window.Scenes) return;
    slot.replaceWith(stageEl);
    Scenes.load(S.pos.l, S.pos.s, force);
    Scenes.step(Math.max(0, S.pos.sent));
  }

  function activityView() {
    const a = actOf(R.act), res = S.answers[a.id];
    let body = "";
    if (a.type === "mcq") {
      body = `<div class="opts">${a.options.map((o, i) => {
        let cls = ""; if (res) cls = i === a.answer ? "right" : i === res.choice ? "wrong" : "";
        return `<button data-opt="${i}" class="${cls}"><b>${L[i]}</b><span>${esc(o)}</span></button>`; }).join("")}</div>
        ${res ? `<div><b style="color:var(${res.correct ? "--ok" : "--bad"})">${res.correct ? "Correct." : "Not quite."}</b> ${esc(a.explain)}</div>` : ""}`;
    } else {
      const d = draft(a.id), txt = draftText(d), dict = R.phase === "dictating";
      body = `
        <textarea id="ed" aria-label="Your answer" ${d.submitted ? "readonly" : ""} placeholder="Say “start my answer”, or type here.">${esc(d.paras.join("\n\n"))}</textarea>
        <div class="interim" id="interim">${esc(R.interim)}</div>
        <div class="row muted" style="font-size:15px"><span>${words(txt)} words · ${d.paras.filter((x) => x.trim()).length} paragraphs</span>
          <span>${d.submitted ? "Submitted " + new Date(d.submitted).toLocaleString() : d.saved ? "Draft saved " + new Date(d.saved).toLocaleTimeString() : "Not saved yet"}</span></div>
        <div class="row">
          <button class="primary" data-do="${dict ? "stop" : "dictate"}" ${d.submitted ? "disabled" : ""}>${dict ? "■ Stop dictation" : "🎙 Start my answer"}</button>
          <button data-do="read">Read my answer</button><button data-do="save">Save</button><button data-do="submit">Submit</button>
        </div>
        ${R.confirm ? `<div class="card confirm"><b>Submit this ${typeName(a.type)}?</b><div>${words(txt)} words in ${d.paras.filter((x) => x.trim()).length} paragraphs. You can't edit after submitting.</div>
          <div class="row"><button class="primary" data-do="confirm">Confirm submit</button><button data-do="cancel">Cancel</button></div></div>` : ""}
        ${res && res.feedback ? `<div>${esc(res.feedback)}</div>` : ""}`;
    }
    return `
    <div class="card">
      <div class="eyebrow">Lesson ${R.act.l + 1} · ${typeName(a.type)}</div>
      <h2>${esc(a.prompt)}</h2>
      ${body}
    </div>`;
  }

  function bindView() {
    if ($('setupHome')) $('setupHome').onclick = openSetup;
    if (R.view === 'setup') {
      $('speechLang').onchange = (e) => { stopAll(); S.lang = e.target.value; save(); R.candidate = null; R.practiceMessage = ''; render(); status('Language saved. Test a command.'); };
      $('checkpoints').onchange = (e) => { S.checkpoints = e.target.checked; save(); };
      document.querySelectorAll('[data-practice]').forEach((b) => b.onclick = () => practice(b.dataset.practice));
      if ($('saveAlias')) $('saveAlias').onclick = () => { if (!R.candidate) return; S.aliases[R.candidate.text] = R.candidate.intent; save(); R.candidate = null; R.practiceMessage = 'Correction saved. Test the same command again to verify it.'; render(); };
      $('clearAliases').onclick = () => { stopAll(); S.aliases = {}; save(); R.candidate = null; R.practiceMessage = 'Corrections cleared.'; render(); };
      $('leaveSetup').onclick = () => { stopAll(); R.view = 'home'; render(); status('Ready. Tap Continue to start.'); };
    }
    document.querySelectorAll("[data-play]").forEach((b) => (b.onclick = () => playFrom(+b.dataset.play, 0, 0)));
    document.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => {
      if (b.dataset.go === "resume") run("CONTINUE");
      else { stopAll(); S = { ...fresh(), rate: S.rate, auto: S.auto, lang: S.lang, checkpoints: S.checkpoints, aliases: S.aliases }; save(); R.view = "home"; render(); status("Progress reset. Tap Play to start."); }
    }));
    document.querySelectorAll("[data-opt]").forEach((b) => (b.onclick = () => answerMCQ(+b.dataset.opt)));
    document.querySelectorAll("[data-do]").forEach((b) => (b.onclick = () => run({ dictate: "START_ANSWER", stop: "STOP_DICT", read: "READ_ANSWER", save: "SAVE", submit: "SUBMIT", confirm: "CONFIRM_TAP", cancel: "CANCEL" }[b.dataset.do])));
    const ed = $("ed");
    if (ed) ed.oninput = () => {
      const d = draft(actOf(R.act).id); if (d.submitted) return;
      d.paras = ed.value.split(/\n\s*\n/); d.saved = Date.now(); save();
      if (R.confirm) { R.confirm = null; const panel = document.querySelector('.confirm'); if (panel) panel.remove(); }
    };
  }
  function highlight(i) {
    if (i < 0 || R.view !== "player") return;
    if (window.Scenes) Scenes.step(i);
    const cc = $("cc"), sec = lesson(S.pos.l).sections[S.pos.s];
    if (cc) cc.textContent = sentences(sec.script)[i] || "";
  }

  // ---------- speech input ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recClosing = null;
  function stopRec() {
    const r = R.rec; R.rec = null;
    if (!r) return recClosing || Promise.resolve();
    clearTimeout(r.startTimer);
    if (r.finishDrain) r.finishDrain();
    if (r.cleanup) r.cleanup();
    r.onresult = r.onerror = r.onstart = r.onspeechstart = null;
    // Wait for the microphone to disconnect before starting another recognizer.
    const closing = new Promise((resolve) => {
      let timer;
      const finish = () => { clearTimeout(timer); r.onend = null; resolve(); };
      r.onend = finish; timer = setTimeout(finish, 1200);
      try { r.abort(); } catch (e) { finish(); }
    });
    recClosing = closing;
    closing.then(() => { if (recClosing === closing) recClosing = null; });
    return closing;
  }
  function startMic(r, valid, fail) {
    const start = () => {
      if (!valid()) return;
      try { r.start(); } catch (e) { fail('Could not start the microphone. Tap Talk to retry, or type below.'); }
    };
    const afterSpeech = () => {
      const delay = speechQuietUntil - Date.now();
      if (delay > 0) r.startTimer = setTimeout(start, delay); else start();
    };
    if (recClosing) recClosing.then(afterSpeech); else afterSpeech();
  }
  function micError(error) {
    return ({
      'not-allowed': 'Microphone blocked. Allow microphone access in browser settings, then tap Talk.',
      'service-not-allowed': 'Speech recognition is disabled by this browser. Use typed commands.',
      'audio-capture': 'No microphone is available. Check your microphone or headset, then tap Talk.',
      network: 'Speech recognition lost its network connection. Check your connection, then tap Talk.',
      'language-not-supported': 'English speech recognition is unavailable. Use typed commands.'
    })[error] || 'Speech recognition stopped (' + error + '). Tap Talk to retry.';
  }

  // The listening clock starts on mic readiness, not while permission is pending.
  function listen(ms = 8000, onSilence, onCommand) {
    stopRec(); stopSpeech();
    const flow = ++R.flow;
    if (!SR || !window.isSecureContext) {
      R.phase = 'idle'; dock();
      if (onSilence) return onSilence();
      return status(!SR ? 'Speech recognition unavailable. Type commands below.' : 'Microphone needs HTTPS or localhost. Type commands below.');
    }
    keepAwake(); R.phase = 'listening'; dock(); status('Starting microphone…'); heard('');
    let r;
    try { r = new SR(); } catch (e) { R.phase = 'idle'; dock(); return status('Microphone unavailable. Type commands below.'); }
    R.rec = r; r.lang = S.lang; r.continuous = false; r.interimResults = true; r.maxAlternatives = 5;
    let timer, hardTimer, endTimer, hadSpeech = false;
    const valid = () => R.rec === r && flow === R.flow && !document.hidden;
    r.cleanup = () => { clearTimeout(timer); clearTimeout(hardTimer); clearTimeout(endTimer); };
    const fail = (message) => { if (!valid()) return; stopRec(); R.phase = 'idle'; releaseWake(); dock(); status(message); };
    const silence = () => {
      if (!valid()) return;
      r.cleanup(); R.rec = null; R.phase = 'idle'; dock();
      if (hadSpeech && !onCommand) commandRetry('Your words were not finalized.');
      else if (hadSpeech) status('Could not recognize that. Choose the test command to try again.');
      else if (onSilence) onSilence(); else status('Didn’t catch that. Tap Talk to try again.');
      if (R.phase === 'idle') releaseWake();
    };
    const endWindow = () => {
      if (!valid()) return;
      clearTimeout(timer); clearTimeout(hardTimer); clearTimeout(endTimer);
      // stop() allows an outstanding final result; abort() discards it.
      try { r.stop(); } catch (e) {}
      endTimer = setTimeout(() => { if (valid()) { stopRec(); R.phase = 'idle'; dock(); if (!hadSpeech && onSilence) onSilence(); else if (hadSpeech && !onCommand) commandRetry('Your words were not finalized.'); else status('Tap Talk to try again.'); if (R.phase === 'idle') releaseWake(); } }, 1500);
    };
    timer = setTimeout(() => fail('Microphone did not start. Check permission, then tap Talk.'), 20000);
    r.onstart = () => {
      if (!valid()) return;
      clearTimeout(timer); status('Listening — speak now. Mic stays off during narration.'); chime(880);
      timer = setTimeout(endWindow, ms); hardTimer = setTimeout(endWindow, 25000);
    };
    r.onspeechstart = () => { if (valid()) { hadSpeech = true; clearTimeout(timer); timer = setTimeout(endWindow, 12000); } };
    r.onresult = (e) => {
      if (!valid()) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]; if (!res.length) continue;
        hadSpeech = true; heard(res[0].transcript);
        clearTimeout(timer); timer = setTimeout(endWindow, 4000);
        if (res.isFinal) {
          const alts = Array.from(res, (x) => x.transcript);
          stopRec(); R.phase = 'idle'; dock(); if (onCommand) { releaseWake(); onCommand(alts); } else handle(alts); return;
        }
      }
    };
    r.onerror = (e) => {
      if (!valid()) return;
      if (e.error === 'no-speech') return; // onend handles normal silence.
      fail(micError(e.error));
    };
    r.onend = silence;
    startMic(r, valid, fail);
  }

  // ---------- command grammar ----------
  const GRAMMAR = [
    ["HELP", /\b(help|what can i say|commands)\b/],
    ["CONFIRM", /^(yes )?(confirm|yes submit|submit it|yes)( it)?$/],
    ["CANCEL", /^(cancel|no|don't submit|do not submit|never mind)$/],
    ["SUBMIT", /^(?:submit|submit my (?:answer|assignment|essay|reflection))$/],
    ["START_ANSWER", /\b(start|begin) (my |the )?(answer|dictation|essay|reflection|writing)\b|\bdictate\b|\banswer the question\b/],
    ["STOP_DICT", /\b(stop|end|finish) (dictation|dictating|my answer)\b/],
    ["READ_ANSWER", /\b(read|play) (me )?(back )?(my|the) answer\b|\bread it back\b/],
    ["SAVE", /^(?:save|save my answer)$/],
    ["NEW_PARA", /\bnew paragraph\b/],
    ["READ_QUESTION", /\b(read|repeat) (me )?(the )?question\b|\bwhat('s| is) the question\b/],
    ["NEXT_LESSON", /\bnext lesson\b/],
    ["PREV_LESSON", /\b(previous|last) lesson\b/],
    ["OPEN_COURSE", /\b(open|show) (my )?course\b|\bmy courses?\b|\bhome\b|\bmain menu\b/],
    ["STATUS", /\bwhere am i\b|\bprogress\b|\bstatus\b/],
    ["FASTER", /\b(faster|speed up)\b/],
    ["SLOWER", /\b(slower|slow down)\b/],
    ["REPEAT", /\b(repeat section|repeat|again|say that again|start (the )?section again)\b/],
    ["NEXT", /\b(next section|next|skip)\b/],
    ["BACK", /\b(go back|back|previous section|previous)\b/],
    ["PAUSE", /\b(pause lesson|pause|stop|hold on|wait)\b/],
    ["CONTINUE", /\b(continue learning|continue|continued|continuing|resume|play|go on|go ahead|keep going|carry on|start|yes|yeah|ok|okay|ready|sure|go)\b/],
  ];
  const LETTER = { a: 0, ay: 0, eh: 0, b: 1, be: 1, bee: 1, c: 2, see: 2, sea: 2, si: 2, d: 3, dee: 3, de: 3 };

  function mcqChoice(t) {
    const m = t.match(/^(?:option|answer|letter|choose|i choose|i think|it's|its|the answer is)?\s*([a-z]+)$/);
    if (m && m[1] in LETTER) return LETTER[m[1]];
    const m2 = t.match(/\b(?:option|answer|letter)\s+([a-z]+)\b/);
    if (m2 && m2[1] in LETTER) return LETTER[m2[1]];
    // match option text by word overlap
    const a = actOf(R.act); let best = -1, score = 0, tied = false;
    const tw = new Set(t.split(" ").filter((w) => w.length > 3));
    a.options.forEach((o, i) => { const ow = norm(o).split(" ").filter((w) => w.length > 3); const s = ow.filter((w) => tw.has(w)).length / Math.max(1, ow.length); if (s > score) { score = s; best = i; tied = false; } else if (s === score) tied = true; });
    return score >= 0.5 && !tied ? best : -1;
  }

  function commandIntent(text) {
    const t = text.replace(/^(?:please |can you |could you )/, '').replace(/ please$/, '');
    for (const [intent, re] of GRAMMAR) {
      const match = t.match(re);
      if (match && match[0] === t) {
        if ((intent === 'CONFIRM' || intent === 'CANCEL') && !R.confirm) continue;
        return intent;
      }
    }
    return Object.hasOwn(S.aliases, t) ? S.aliases[t] : null;
  }
  function handle(alts) {
    if (R.view === 'setup') return status('Choose a test command, or tap Done to learn.');
    for (const [index, raw] of alts.entries()) {
      const t = norm(raw), intent = commandIntent(t);
      if (intent && (index === 0 || !['CONFIRM', 'SUBMIT', 'CANCEL', 'START_ANSWER', 'SAVE'].includes(intent))) {
        // Alternative transcripts may rescue navigation, but conflicting alternatives need clarification.
        if (index > 0 && new Set(alts.slice(index).map((x) => commandIntent(norm(x))).filter(Boolean)).size > 1) break;
        R.commandMisses = 0; return run(intent);
      }
      if (index === 0 && R.view === 'activity' && actOf(R.act).type === 'mcq' && !S.answers[actOf(R.act).id]) {
        const c = mcqChoice(t); if (c >= 0) { R.commandMisses = 0; return answerMCQ(c); }
      }
    }
    return commandRetry('I heard ' + alts[0] + '.');
  }

  function commandRetry(message) {
    R.commandMisses = (R.commandMisses || 0) + 1;
    if (R.commandMisses > 2) {
      stopAll(); render(); return status('Still not understood. Tap Check my voice to test your language and commands. Your place is saved.');
    }
    return speakThen(message + ' Please say a short command: go back, next section, continue learning, or help.');
  }

  // ---------- actions ----------
  function stopAll() { R.action++; R.flow++; stopRec(); stopSpeech(); R.confirm = null; R.interim = ""; R.phase = "idle"; releaseWake(); }

  async function run(intent) {
    const action = ++R.action;
    if (intent !== "STOP_DICT" && ["dictating", "finishing"].includes(R.phase)) await stopDictation(false);
    if (action !== R.action) return;
    const inAct = R.view === "activity", a = inAct ? actOf(R.act) : null;
    switch (intent) {
      case "HELP": {
        const t = inAct
          ? (a.type === "mcq" ? "Say option A, B, C or D. Or say read the question, or next." : "Say start my answer, then speak. While dictating, say new paragraph, or stop dictation. Then say read my answer, save my answer, or submit my assignment.")
          : "Wait for Your turn and the tone before speaking. During narration, tap Talk to interrupt. You can say: continue learning, pause lesson, repeat section, next section, go back, next lesson, faster, slower, where am I, or open my course. Use Check my voice to test your language and save command corrections.";
        return speakThen(t);
      }
      case "OPEN_COURSE": stopAll(); R.view = "home"; R.phase = "idle"; render();
        return speakThen(`${C.title}. ${C.lessons.length} lessons. You are on lesson ${S.pos.l + 1}. Say continue learning to resume.`);
      case "STATUS": {
        const doneN = C.lessons.filter((x) => S.done[x.id]).length;
        const where = inAct ? `an activity in lesson ${R.act.l + 1}` : `lesson ${S.pos.l + 1}, section ${S.pos.s + 1}, ${lesson(S.pos.l).sections[S.pos.s].title}`;
        return speakThen(`You are on ${where}. ${doneN} of ${C.lessons.length} lessons are done.`, R.phase === "paused" || R.view === "player");
      }
      case "FASTER": case "SLOWER": {
        S.rate = Math.min(2, Math.max(0.75, +(S.rate + (intent === "FASTER" ? 0.25 : -0.25)).toFixed(2))); save(); dock();
        if (R.view === "player") return playFrom(S.pos.l, S.pos.s, S.pos.sent);
        return speakThen(`Speed ${S.rate}.`);
      }
      case "PAUSE": return pause();
      case "CONTINUE":
        if (inAct) return a.type === "mcq" && S.answers[a.id] ? nextActivity() : readQuestion();
        return playFrom(S.pos.l, S.pos.s, S.pos.sent);
      case "REPEAT":
        if (inAct) return readQuestion();
        return playFrom(S.pos.l, S.pos.s, 0);
      case "NEXT":
        if (inAct) return nextActivity();
        return S.pos.s + 1 < lesson(S.pos.l).sections.length ? playFrom(S.pos.l, S.pos.s + 1, 0) : openActivity(S.pos.l, 0);
      case "BACK":
        if (inAct) return playFrom(R.act.l, lesson(R.act.l).sections.length - 1, 0);
        if (S.pos.sent > 1) return playFrom(S.pos.l, S.pos.s, 0);
        if (S.pos.s > 0) return playFrom(S.pos.l, S.pos.s - 1, 0);
        return S.pos.l > 0 ? playFrom(S.pos.l - 1, 0, 0) : playFrom(0, 0, 0);
      case "NEXT_LESSON": { const l = (inAct ? R.act.l : S.pos.l) + 1; return l < C.lessons.length ? playFrom(l, 0, 0) : speakThen("This is the last lesson."); }
      case "PREV_LESSON": { const l = (inAct ? R.act.l : S.pos.l) - 1; return playFrom(Math.max(0, l), 0, 0); }
      case "READ_QUESTION":
        if (inAct) return readQuestion();
        return speakThen("There's no question here yet. Questions come at the end of each lesson. Say next to skip ahead.");
      case "START_ANSWER":
        if (!inAct || a.type === "mcq") return speakThen(inAct ? "This is a multiple choice question. Say option A, B, C or D." : "Open an assignment first. Say next until you reach one.");
        return startDictation();
      case "STOP_DICT": return stopDictation(true);
      case "NEW_PARA":
        if (inAct && a.type !== "mcq" && !draft(a.id).submitted) { const d = draft(a.id); d.paras.push(""); save(); render(); return speakThen("New paragraph."); }
        return;
      case "READ_ANSWER": if (inAct && a.type !== "mcq") return readAnswer(); return;
      case "SAVE":
        if (inAct && a.type !== "mcq") { const d = draft(a.id); d.saved = Date.now(); save(); render(); return speakThen("Your answer is saved."); }
        return speakThen("Your progress is saved automatically.");
      case "SUBMIT": return askSubmit();
      case "CONFIRM": case "CONFIRM_TAP": return doSubmit();
      case "CANCEL": R.confirm = null; render(); return speakThen("Cancelled. Your draft is still saved.");
    }
  }

  // Say something, then either resume playback or open a listen window.
  async function speakThen(text, resume) {
    const wasPlaying = resume ?? false;
    stopRec(); const flow = ++R.flow; R.phase = "speaking"; dock();
    await say(text);
    if (flow !== R.flow) return;
    if (wasPlaying) return playFrom(S.pos.l, S.pos.s, S.pos.sent);
    R.phase = "idle"; dock();
    if (S.auto) listen(); else { releaseWake(); status("Tap Talk for a command."); }
  }

  function pause() {
    R.action++; R.flow++; stopRec(); stopSpeech(); R.phase = "paused"; if (R.view === "player") render(); else dock();
    releaseWake();
    status("Paused. Tap Resume, or tap Talk and say “continue”.");
  }

  async function playFrom(l, s, sent) {
    const action = ++R.action;
    if (["dictating", "finishing"].includes(R.phase)) await stopDictation(false);
    if (action !== R.action) return;
    const Lc = lesson(l), sec = Lc.sections[s], count = sentences(sec.script).length;
    // The saved end marker means Continue advances after a section's listen window.
    if (sent >= count) return s + 1 < Lc.sections.length ? playFrom(l, s + 1, 0) : openActivity(l, 0);
    keepAwake(); stopRec(); stopSpeech(); R.confirm = null;
    const flow = ++R.flow;
    S.pos = { l, s, sent }; save();
    R.view = "player"; R.phase = "playing"; render(); window.scrollTo(0, 0);
    sent = Math.max(0, sent); S.pos.sent = sent; save();
    if (sent === 0 && window.Scenes) { Scenes.load(l, s, true); Scenes.step(0); }
    status(`Playing · ${sec.title}`);
    if (sent === 0) {
      await new Promise((res) => speakList(sentences((s === 0 ? `Lesson ${l + 1}. ${Lc.title}. ` : "") + sec.title + "."), null, res));
      if (flow !== R.flow) return;
    }
    const list = sentences(sec.script).slice(sent, S.auto && S.checkpoints ? sent + 3 : undefined);
    speakList(list, (i) => { S.pos.sent = sent + i; save(); highlight(sent + i); }, () => {
      if (flow !== R.flow) return;
      const more = s + 1 < Lc.sections.length;
      const go = () => (more ? playFrom(l, s + 1, 0) : openActivity(l, 0));
      const nextSent = sent + list.length;
      S.pos.sent = nextSent; save();
      const advance = nextSent < count ? () => playFrom(l, s, nextSent) : go;
      if (S.auto) {
        R.phase = 'speaking'; dock();
        // Full spoken prompt once per session; afterwards just the listening tone, so the lesson flows like a video.
        const cue = R.cuedTurn ? Promise.resolve() : say('Your turn. Say go back, repeat section, or pause. Or wait to keep listening.');
        R.cuedTurn = true;
        cue.then(() => {
          if (flow === R.flow) listen(R.cuedTurn ? 5000 : 8000, advance);
        });
      } else advance();
    });
  }

  function readQuestion() {
    const a = actOf(R.act);
    let t = a.prompt;
    if (a.type === "mcq") t += " " + a.options.map((o, i) => `Option ${L[i]}. ${o}.`).join(" ") + " Say your answer.";
    else if (a.type === "essay") t += " Say start my answer when you are ready. Essays are best done when you are parked.";
    else t += " Say start my answer when you are ready.";
    const flow = ++R.flow; stopRec(); R.phase = "speaking"; dock();
    say(t).then(() => { if (flow === R.flow) listen(a.type === "mcq" ? 9000 : 6000); });
  }

  function openActivity(l, ai) {
    stopRec(); stopSpeech(); R.confirm = null; R.interim = "";
    S.pos = { l, s: lesson(l).sections.length - 1, sent: 0 }; save();
    R.view = "activity"; R.act = { l, a: ai }; R.phase = "idle"; render(); window.scrollTo(0, 0);
    readQuestion();
  }

  function nextActivity() {
    const { l, a } = R.act;
    if (a + 1 < lesson(l).activities.length) return openActivity(l, a + 1);
    return lessonDone(l);
  }

  async function lessonDone(l) {
    stopRec(); R.confirm = null;
    S.done[lesson(l).id] = true; save();
    const flow = ++R.flow; R.phase = "speaking"; dock();
    if (l + 1 >= C.lessons.length) { await say("Course complete. Well done."); if (flow === R.flow) { R.view = "home"; R.phase = "idle"; releaseWake(); render(); status("Course complete."); } return; }
    await say(`Lesson ${l + 1} complete. Next is lesson ${l + 2}, ${lesson(l + 1).title}. Say pause to stop, or I'll start it.`);
    if (flow !== R.flow) return;
    listen(4500, () => playFrom(l + 1, 0, 0));
  }

  async function answerMCQ(i) {
    const a = actOf(R.act);
    if (S.answers[a.id]) return;
    const correct = i === a.answer;
    S.answers[a.id] = { choice: i, correct, at: Date.now() }; save();
    stopRec(); render();
    const flow = ++R.flow; R.phase = "speaking"; dock();
    chime(correct ? 1320 : 330, 160);
    await say(`${correct ? "Correct." : "Not quite. The answer is " + L[a.answer] + "."} ${a.explain}`);
    if (flow !== R.flow) return;
    if (S.auto) listen(6000, nextActivity); else { R.phase = "idle"; dock(); status("Tap Talk and say “next” to continue."); }
  }

  // ---------- dictation ----------
  const PUNCT = [[/\s*\bcomma\b/gi, ","], [/\s*\b(full stop|period)\b/gi, "."], [/\s*\bquestion mark\b/gi, "?"], [/\s*\bexclamation (mark|point)\b/gi, "!"], [/\s*\bcolon\b/gi, ":"]];
  const ESCAPES = [
    ["STOP", /(?:^| )(stop dictation|stop dictating|end dictation|end my answer|finish my answer|i'm done)$/],
    ["PARA", /(?:^| )(add a new paragraph|new paragraph|next paragraph)$/],
    ["READ", /(?:^| )(read my answer|read it back)$/],
    ["SAVE", /(?:^| )(save my answer)$/],
    ["UNDO", /(?:^| )(scratch that|delete last sentence|delete the last sentence)$/],
  ];

  function startDictation() {
    const a = actOf(R.act);
    if (!SR || !window.isSecureContext) return speakThen("Speech recognition needs a supported browser and HTTPS. You can type your answer.");
    if (draft(a.id).submitted) return speakThen("This was already submitted.");
    keepAwake(); R.dictFailures = 0;
    const flow = ++R.flow; stopRec(); R.confirm = null; R.phase = "speaking"; dock();
    say("Go ahead.").then(() => {
      if (flow !== R.flow) return;
      R.phase = "dictating"; R.interim = ""; render();
      status("Dictating… say “stop dictation” when done.");
      dictRec();
    });
  }

  // Restart only the current dictation session, with bounded retries on empty ends.
  function dictRec(flow = R.flow) {
    if (flow !== R.flow || R.phase !== 'dictating' || document.hidden) return;
    let r;
    try { r = new SR(); } catch (e) { R.phase = 'idle'; render(); return status('Microphone unavailable. Type your answer.'); }
    R.rec = r;
    r.lang = S.lang; r.continuous = true; r.interimResults = true;
    let timer, restartTimer; const committed = new Set();
    const valid = () => R.rec === r && flow === R.flow && !document.hidden;
    r.cleanup = () => { clearTimeout(timer); clearTimeout(restartTimer); };
    const fail = (message) => {
      if (!valid()) return;
      if (r.finishDrain) { r.finishDrain(); return; }
      stopRec(); R.phase = 'idle'; R.interim = ''; releaseWake(); render(); status(message + ' Final words are saved.');
    };
    const armIdle = () => {
      clearTimeout(timer);
      if (R.phase !== 'dictating') return;
      timer = setTimeout(() => {
        if (!valid()) return;
        // A silent/disconnected recognizer may never send onend. Ask it to
        // finalize, then surface a recoverable failure if it still does not end.
        try { r.stop(); } catch (e) {}
        if (valid() && R.phase === 'dictating') timer = setTimeout(() => fail('Microphone stopped responding. Tap Start my answer to retry.'), 1800);
      }, 30000);
    };
    timer = setTimeout(() => fail('Microphone did not start. Tap Start my answer to retry.'), 20000);
    r.onstart = () => {
      if (!valid()) return;
      armIdle(); status('Dictating… say “stop dictation” when done.');
    };
    r.onspeechstart = () => { if (valid()) armIdle(); };
    r.onresult = (e) => {
      if (!valid()) return;
      armIdle();
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!valid()) break;
        const res = e.results[i]; if (!res.length) continue;
        if (res.isFinal) {
          if (committed.has(i)) continue;
          committed.add(i); R.dictFailures = 0;
          segment(res[0].transcript, R.phase !== 'finishing');
        } else interim += res[0].transcript + ' ';
      }
      if (!valid()) return;
      R.interim = interim.trim(); const el = $('interim'); if (el) el.textContent = R.interim;
    };
    r.onerror = (e) => {
      if (!valid()) return;
      if (e.error === 'no-speech') return;
      fail(micError(e.error));
    };
    r.onend = () => {
      if (!valid()) return;
      r.cleanup();
      if (r.finishDrain) return r.finishDrain();
      const lost = !!R.interim; R.interim = ''; const el = $('interim'); if (el) el.textContent = '';
      if (++R.dictFailures > 3) { R.rec = null; R.phase = 'idle'; releaseWake(); render(); return status('Dictation stopped after repeated microphone disconnects. Final words saved. Tap Start my answer.'); }
      status(lost ? 'Unfinished words were not recognized; please repeat them. Reconnecting…' : 'Reconnecting microphone…');
      restartTimer = setTimeout(() => { if (valid() && R.phase === 'dictating') { R.rec = null; dictRec(flow); } }, 350 * R.dictFailures);
    };
    startMic(r, valid, fail);
  }



  function segment(raw, allowCommands = true) {
    if (!["dictating", "finishing"].includes(R.phase)) return;
    let txt = raw.trim(); if (!txt) return;
    const n = norm(txt); let action = null;
    for (const [act, re] of ESCAPES) {
      const m = n.match(re);
      if (m) {
        action = act;
        const suffix = new RegExp("(?:^|[\\s.,!?;:])" + m[1].split(" ").join("[\\s.,!?;:]+") + "[\\s.,!?;:]*$", "i");
        txt = txt.replace(/[’‘]/g, "'").replace(suffix, "").trim(); break;
      }
    }
    const a = actOf(R.act), d = draft(a.id);
    if (d.submitted) return;
    if (!allowCommands) action = null;
    if (action === "UNDO") {
      const p = d.paras[d.paras.length - 1], ss = sentences(p); ss.pop(); d.paras[d.paras.length - 1] = ss.join(" ");
    } else if (txt) {
      for (const [re, rep] of PUNCT) txt = txt.replace(re, rep);
      const cur = d.paras[d.paras.length - 1].trim();
      if (!cur || /[.?!]$/.test(cur)) txt = txt.charAt(0).toUpperCase() + txt.slice(1);
      if (!/[.?!,:]$/.test(txt)) txt += ".";
      d.paras[d.paras.length - 1] = (cur ? cur + " " : "") + txt;
    }
    d.saved = Date.now(); save(); // autosave every segment
    const ed = $("ed"); if (ed) { ed.value = d.paras.join("\n\n"); ed.scrollTop = ed.scrollHeight; }
    if (action === "PARA") { d.paras.push(""); save(); chime(660, 80); if (ed) ed.value = d.paras.join("\n\n"); }
    else if (action === "STOP") stopDictation(true);
    else if (action === "READ") run("READ_ANSWER");
    else if (action === "SAVE") run("SAVE");
    else if (action === "UNDO") chime(330, 80);
    R.interim = "";
  }

  async function stopDictation(announce) {
    if (R.dictStop) return R.dictStop;
    if (R.phase !== 'dictating') return;
    const r = R.rec, flow = R.flow, id = actOf(R.act).id;
    R.phase = 'finishing'; dock(); status('Saving final words…');
    const drain = new Promise((resolve) => {
      if (!r) return resolve();
      let timer;
      r.finishDrain = () => {
        if (!r.finishDrain) return;
        r.finishDrain = null; clearTimeout(timer); if (r.cleanup) r.cleanup();
        if (R.rec === r) R.rec = null;
        r.onresult = r.onerror = r.onend = r.onstart = null;
        resolve();
      };
      timer = setTimeout(() => { try { r.abort(); } catch (e) {} if (r.finishDrain) r.finishDrain(); }, 1800);
      try { r.stop(); } catch (e) { r.finishDrain(); }
    });
    R.dictStop = drain;
    await drain; R.dictStop = null;
    if (flow !== R.flow) return;
    const d = draft(id); d.saved = Date.now(); save();
    const unfinished = !!R.interim; R.interim = ''; R.phase = 'idle'; render();
    if (announce) return speakThen('Dictation stopped. ' + words(draftText(d)) + ' words saved. ' + (unfinished ? 'The last unfinished words were not recognized; please repeat them. ' : '') + 'Say read my answer, or submit my assignment.');
  }



  async function readAnswer() {
    const d = draft(actOf(R.act).id), ps = d.paras.filter((p) => p.trim());
    if (!ps.length) return speakThen("Your answer is empty. Say start my answer.");
    const flow = ++R.flow; stopRec(); R.phase = "speaking"; dock();
    await say(ps.map((p, i) => (ps.length > 1 ? `Paragraph ${i + 1}. ` : "") + p).join(" "));
    if (flow !== R.flow) return;
    R.phase = "idle"; dock();
    if (S.auto) listen(); else { releaseWake(); status("Tap Talk and say start my answer to add more, or submit my assignment."); }
  }

  function askSubmit() {
    if (R.view !== "activity" || actOf(R.act).type === "mcq") return speakThen("There's nothing to submit here.");
    const a = actOf(R.act), d = draft(a.id), t = draftText(d);
    if (d.submitted) return speakThen("This was already submitted.");
    if (!t) return speakThen("Your answer is empty. Say start my answer first.");
    R.confirm = { id: a.id }; render();
    const flow = ++R.flow; R.phase = "speaking"; dock();
    say(`Your ${typeName(a.type)} has ${words(t)} words. Say confirm to submit, or cancel.`).then(() => { if (flow === R.flow) listen(8000, () => status("Waiting for confirm or cancel.")); });
  }

  function doSubmit() {
    if (!R.confirm || R.view !== "activity" || R.confirm.id !== actOf(R.act).id) return;
    const a = actOf(R.act), d = draft(a.id); d.submitted = Date.now(); R.confirm = null;
    let fb = "Submitted.";
    if (a.type === "short") {
      const t = norm(draftText(d));
      const hit = a.keywords.map((alts) => alts.some((w) => t.includes(w)));
      const missing = a.keywordNames.filter((_, i) => !hit[i]);
      fb = `Submitted. You named ${hit.filter(Boolean).length} of 5 steps.` + (missing.length ? ` Missing: ${missing.join(", ")}.` : " Well done.");
    }
    S.answers[a.id] = { submitted: true, feedback: fb }; save(); render();
    const flow = ++R.flow; R.phase = "speaking"; dock();
    say(fb + " Say next to continue.").then(() => { if (flow === R.flow) { if (S.auto) listen(4000, nextActivity); else { R.phase = "idle"; dock(); } } });
  }

  // ---------- controls ----------
  function talk() {
    keepAwake();
    if (R.phase === "finishing") return;
    if (R.phase === "dictating") return stopDictation(true);
    if (R.phase === "listening") { stopRec(); R.flow++; R.phase = "idle"; releaseWake(); dock(); return status("Stopped listening."); }
    R.commandMisses = 0;
    const wasPlaying = R.phase === "playing";
    // Pause playback while listening (no barge-in: the mic would hear the voice).
    listen(8000, () => (wasPlaying ? playFrom(S.pos.l, S.pos.s, S.pos.sent) : status("Didn't catch that. Tap Talk to try again.")));
  }
  $("talk").onclick = talk;
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); talk(); }
  });
  $("bPlay").onclick = () => (R.phase === "playing" ? pause() : run("CONTINUE"));
  $("bNext").onclick = () => run("NEXT");
  $("bPrev").onclick = () => run("BACK");
  $("bRate").onclick = () => { const rs = [0.75, 1, 1.25, 1.5, 1.75, 2]; S.rate = rs[(rs.indexOf(S.rate) + 1) % rs.length]; save(); dock(); if (R.phase === "playing") playFrom(S.pos.l, S.pos.s, S.pos.sent); };
  $("autoL").onchange = (e) => { S.auto = e.target.checked; save(); };
  $("voiceSetup").onclick = openSetup;
  $("help").onclick = () => run("HELP");
  $("brand").onclick = () => run("OPEN_COURSE");
  $("typed").onsubmit = async (e) => {
    e.preventDefault(); const v = $("typedIn").value.trim(); if (!v) return;
    $("typedIn").value = ""; heard(v);
    const action = ++R.action;
    if (["dictating", "finishing"].includes(R.phase)) await stopDictation(false);
    if (action !== R.action) return;
    stopRec(); stopSpeech(); R.flow++; R.phase = "idle"; handle([v]);
  };

  // Bluetooth / lock-screen buttons where the browser exposes them (needs active media; best effort).
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", () => run("CONTINUE"));
      navigator.mediaSession.setActionHandler("pause", () => run("PAUSE"));
      navigator.mediaSession.setActionHandler("nexttrack", () => run("NEXT"));
      navigator.mediaSession.setActionHandler("previoustrack", talk);
    } catch (e) {}
  }
  if (synth) synth.getVoices(); // Voice lists may populate later; voice() reads afresh for each chunk.
  if (!SR) status("No speech recognition in this browser (use Chrome or Edge). Listening and typed commands still work.");

  render();
})();
