// Adaptive narrated player: present → check → evaluate per learning outcome → remediate below 80% → report.
// One control: Pause / Continue (it becomes "Repeat question" while waiting for an answer).
// (The voice-command version is kept in voice.html + app.js.)
(() => {
  const C = window.COURSE, A = window.ADAPTIVE, $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const sentences = (t) => (t.match(/[^.!?…]+[.!?…]+["')]*|\S[^.!?…]*$/g) || []).map((x) => x.trim()).filter(Boolean);
  const L = "ABCD", pct = (x) => Math.round(x * 100);
  const LOS = Object.keys(A.outcomes);
  const allQ = {};
  Object.values(A.core).flat().concat(Object.values(A.practice).flat()).forEach((q) => (allQ[q.id] = q));

  // Shuffle options per question (stable per question id) so the answer isn't always first.
  function order(q) {
    let h = 0; for (const ch of q.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const idx = q.o.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx; // idx[displayPos] = original index; answer is original index 0
  }

  // ---------- plan ----------
  const lessonPlan = (l) => C.lessons[l].sections.map((_, s) => ({ kind: "sec", l, s }))
    .concat([{ kind: "quiz", l, round: 0, qs: A.core[C.lessons[l].id].map((q) => q.id) }, { kind: "result", l, round: 0 }]);

  // ---------- state (this device) ----------
  const KEY = "voicelearn.adaptive.v1";
  const fresh = () => ({ queue: lessonPlan(0), idx: 0, part: "main", sent: 0, q: 0, ans: {}, rounds: {}, seen: {}, lessons: {}, lo: {}, hist: [] });
  let P;
  try { P = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!P || !Array.isArray(P.queue) || !P.queue[P.idx] || !Array.isArray(P.hist)) P = fresh();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} };
  const cur = () => P.queue[P.idx];
  const rkey = (st) => `${st.l}:${st.round}`;

  let view = "home", playing = false, waiting = false, tok = 0, script = null;

  // ---------- speech ----------
  const synth = window.speechSynthesis;
  // Listener's voice + speed (this device).
  const VKEY = "voicelearn.voice.v1";
  let VS = { uri: "", rate: 1, pitch: 1 };
  try { VS = Object.assign(VS, JSON.parse(localStorage.getItem(VKEY)) || {}); } catch (e) {}
  const saveVS = () => { try { localStorage.setItem(VKEY, JSON.stringify(VS)); } catch (e) {} };
  const enVoices = () => synth.getVoices().filter((v) => /^en/i.test(v.lang));
  function voice() {
    const vs = enVoices();
    return vs.find((v) => v.voiceURI === VS.uri) || vs.find((v) => v.localService && /en[-_]US/i.test(v.lang)) || vs.find((v) => v.localService) || vs.find((v) => v.default) || vs[0];
  }
  // Speak list[from..] as one continuous queue: the engine flows from sentence to sentence with no
  // round-trip pause. Each sentence's onstart drives the visuals. A watchdog restarts from the next
  // unheard sentence if the engine stalls or drops events (mobile Chrome).
  function speak(list, from, onSentence, onDone, tries = 0) {
    const my = ++tok; synth.cancel();
    if (from >= list.length) return onDone();
    let shown = from - 1, started = from - 1, done = false, quiet = 0;
    const show = (i) => { if (my === tok && i > shown) { shown = i; onSentence(i); } };
    const finish = () => { if (done || my !== tok) return; done = true; clearInterval(dog); onDone(); };
    const v = voice();
    for (let i = from; i < list.length; i++) {
      const u = new SpeechSynthesisUtterance(list[i]);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
      u.rate = VS.rate; u.pitch = VS.pitch;
      u.onstart = () => { if (my !== tok) return; started = Math.max(started, i); show(i); };
      if (i === list.length - 1) u.onend = finish;
      u.onerror = (e) => { if (e.error !== "interrupted" && e.error !== "canceled" && i === list.length - 1) finish(); };
      synth.speak(u);
    }
    show(from); // first visual immediately, no waiting for the engine
    const dog = setInterval(() => {
      if (my !== tok || done) return clearInterval(dog);
      if (document.hidden || synth.speaking || synth.pending) { quiet = 0; return; } // asleep, or still talking
      if (++quiet < (started >= from ? 3 : 10)) return;
      clearInterval(dog);
      if (started >= list.length - 1) return finish();
      // Stalled: resume after the last sentence that really started (or skip one if nothing ever starts).
      const next = started >= from ? started + 1 : (tries >= 1 ? from + 1 : from);
      speak(list, next, onSentence, onDone, started >= from ? 0 : tries + 1);
    }, 500);
  }
  const stopSpeech = () => { tok++; synth.cancel(); };

  let wake = null;
  async function keepAwake() { try { if (!wake && "wakeLock" in navigator && !document.hidden) { wake = await navigator.wakeLock.request("screen"); wake.onrelease = () => (wake = null); } } catch (e) {} }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && playing) { keepAwake(); play(); } });

  // ---------- evaluation ----------
  function roundScore(st) {
    const r = P.rounds[rkey(st)] || {}, by = {};
    Object.entries(r).forEach(([id, ok]) => { const lo = allQ[id].lo; (by[lo] = by[lo] || { n: 0, c: 0 }).n++; if (ok) by[lo].c++; });
    const n = Object.values(r).length, c = Object.values(r).filter(Boolean).length;
    return { n, c, score: n ? c / n : 0, by };
  }
  // Outcome mastery: if the latest round that tested an outcome asked 2+ questions on it, use that round's result
  // (so passing a practice round counts as recovered). Otherwise use the last 4 answers, so one lucky answer
  // can't hide repeated failures.
  function refreshMastery() {
    LOS.forEach((k) => {
      const all = P.hist.filter((x) => x.lo === k);
      if (!all.length) return;
      const lastR = all[all.length - 1].r;
      const inRound = lastR ? all.filter((x) => x.r === lastR) : [];
      const h = inRound.length >= 2 ? inRound : all.slice(-4);
      P.lo[k] = h.filter((x) => x.ok).length / h.length;
    });
  }
  // Older saved progress has no round on each answer: recover it from the round records, then recompute.
  P.hist.forEach((x) => {
    if (x.r) return;
    const keys = Object.keys(P.rounds).filter((rk) => x.id in P.rounds[rk]);
    x.r = keys.sort((a, b) => +a.split(":")[1] - +b.split(":")[1]).pop();
  });
  refreshMastery(); save();
  function pickPractice(lo, k) {
    const pool = A.practice[lo].filter((q) => !P.seen[q.id]);
    const wrongCore = Object.values(A.core).flat().filter((q) => q.lo === lo && P.ans[q.id] === false);
    return pool.concat(wrongCore).slice(0, k).map((q) => q.id);
  }

  // ---------- views ----------
  const stageEl = document.createElement("div");
  Scenes.mount(stageEl);
  // Lesson "look": Story cards or Signal Studio (style engines from lab/), fed with MOMENTS.
  // Checks, results and the report keep the classic interactive stage.
  const lookEl = document.createElement("div");
  lookEl.className = "look";
  let look = null, lookStep = -1;
  const lookStyle = () => (window.STYLES || []).find((s) => s.id === (VS.look || "story")) || null;
  function fitLook() {
    const k = Math.max(1, Math.min(lookEl.clientHeight / 600, lookEl.clientWidth / 300, 2.2));
    lookEl.style.setProperty("--k", k.toFixed(3));
    lookEl.toggleAttribute("data-tall", lookEl.clientHeight / Math.max(1, lookEl.clientWidth) > 1.75);
  }
  function showLook(on) { lookEl.hidden = !on; stageEl.hidden = on; }
  function vstep(j) {
    if (look) { lookStep = j; look.step(j); } else Scenes.step(Math.max(0, j));
  }
  // Build the look for a section/review; returns false if no moments exist (classic stage is used instead).
  function loadLook(key, lessonLabel, title, body) {
    const s = lookStyle(), moments = window.MOMENTS && MOMENTS[key];
    look = null;
    if (!s || !moments) { showLook(false); return false; }
    showLook(true);
    s.mount(lookEl); fitLook();
    s.load({ lesson: lessonLabel, title, sentences: body, moments });
    look = s; lookStep = -1; s.step(-1);
    return true;
  }

  function loBadges() {
    return LOS.map((k) => {
      const m = P.lo[k];
      const cls = m == null ? "" : m >= A.target ? "done" : "warn";
      return `<span class="pill ${cls}" title="${esc(A.outcomes[k].full)}">${A.outcomes[k].name}${m == null ? "" : " · " + pct(m) + "%"}</span>`;
    }).join(" ");
  }
  function renderHome() {
    view = "home"; document.body.dataset.view = "home";
    const st = cur(), les = C.lessons[st.l] || C.lessons[0];
    $("main").innerHTML = `
      <div class="card"><div class="eyebrow">Continue</div><h1>${st.kind === "report" ? "Your achievement report" : `Lesson ${st.l + 1}: ${esc(les.title)}`}</h1>
        <div class="row"><button class="primary" id="resume">▶ Continue</button><button id="restart">Start over</button></div></div>
      <div class="card"><div class="eyebrow">Learning outcomes · target ${pct(A.target)}%</div><div class="row">${loBadges()}</div></div>
      <div class="card"><div class="eyebrow">${esc(C.code)} · ${esc(C.subtitle)}</div><h2>${esc(C.title)}</h2>
        <div>${C.lessons.map((x, l) => { const r = P.lessons[x.id];
          const pill = r ? (r.passed ? `<span class="pill done">${pct(r.score)}%</span>` : `<span class="pill warn">${pct(r.score)}%</span>`) : (st.l === l ? '<span class="pill now">In progress</span>' : '<span class="pill">Not started</span>');
          return `<div class="lesson"><div style="min-width:0"><b>${l + 1}. ${esc(x.title)}</b><div class="muted" style="font-size:15px">${x.sections.length} parts + check</div></div>
          <div class="row">${pill}<button data-l="${l}">Play</button></div></div>`; }).join("")}</div></div>`;
    $("resume").onclick = () => openPlayer();
    $("restart").onclick = () => { P = fresh(); save(); openPlayer(); };
    document.querySelectorAll("[data-l]").forEach((b) => (b.onclick = () => { P.queue = lessonPlan(+b.dataset.l); P.idx = 0; P.part = "main"; P.sent = 0; P.q = 0; save(); openPlayer(); }));
    bar();
  }
  function openPlayer() {
    view = "player"; document.body.dataset.view = "player";
    $("main").innerHTML = `<div class="player"><div id="slot"></div></div><div class="cc" id="cc"></div><div class="card send" id="send" hidden></div>`;
    $("slot").replaceWith(stageEl);
    stageEl.after(lookEl);
    window.scrollTo(0, 0);
    load(); play();
  }
  function bar() {
    $("toggle").textContent = waiting ? "↻ Repeat question" : playing ? "⏸ Pause" : "▶ Continue";
    const st = cur();
    const where = st.kind === "report" ? "Final report" : st.kind === "review" ? `Review · ${A.outcomes[st.lo].name}` : st.kind === "quiz" ? (st.round ? "Practice" : `Lesson ${st.l + 1} check`) : `Lesson ${st.l + 1} of ${C.lessons.length}`;
    $("status").textContent = `${where} · ${waiting ? "Your answer" : playing ? "Playing" : "Paused"}`;
  }
  const caption = (t) => { const cc = $("cc"); if (cc) cc.textContent = t || ""; };
  const capOf = (l) => `<b>Lesson ${l + 1}</b> · ${esc(C.lessons[l].title)}`;

  // ---------- build the current step's narration + scene ----------
  function load() {
    const st = cur();
    waiting = false;
    if (st.kind === "sec") {
      const les = C.lessons[st.l], sec = les.sections[st.s];
      const intro = (st.s === 0 ? [`Lesson ${st.l + 1}. ${les.title}.`] : []).concat([sec.title + "."]);
      const body = sentences(sec.script);
      script = { main: intro.concat(body), offset: intro.length };
      if (!loadLook(`${les.id}:${st.s}`, `Lesson ${st.l + 1} · ${les.title}`, sec.title, body)) Scenes.load(st.l, st.s, true);
    } else if (st.kind === "review") {
      const r = A.review[st.lo], body = sentences(r.script);
      script = { main: [`Review. ${r.title}.`].concat(body), offset: 1 };
      if (!loadLook(`review:${st.lo}`, `Review · ${A.outcomes[st.lo].name}`, r.title, body))
        Scenes.loadBeats(`<b>Review</b> · ${esc(A.outcomes[st.lo].full)}`, "", r.beats);
    } else { look = null; showLook(false); }
    if (st.kind === "quiz") loadQuestion(st);
    else if (st.kind === "result") loadResult(st);
    else if (st.kind === "report") loadReport();
    renderSend(st.kind === "report" && !!T.sendReport);
  }

  // ---------- send the achievement report (no server: mail app, share sheet, or copy) ----------
  const PREF = "voicelearn.sender.v1", T = C.teacher || { name: C.author, email: "" };
  let pref = {};
  try { pref = JSON.parse(localStorage.getItem(PREF)) || {}; } catch (e) {}

  function reportText(name) {
    const line = (k) => { const m = P.lo[k]; return `- ${A.outcomes[k].full}: ${m == null ? "not assessed" : pct(m) + "%"}${m != null && m < A.target ? "  (below target)" : ""}`; };
    const vals = LOS.map((k) => P.lo[k] ?? 0), overall = vals.reduce((a, b) => a + b, 0) / LOS.length;
    const weak = LOS.filter((k) => (P.lo[k] ?? 0) < A.target);
    return [
      `VoiceLearn achievement report`,
      `Student: ${name || "(not given)"}`,
      `Teacher: ${T.name}`,
      `Course: ${C.code} · ${C.title}`,
      `Date: ${new Date().toLocaleString()}`,
      ``,
      `Overall mastery: ${pct(overall)}% (target ${pct(A.target)}%)`,
      ``,
      `Learning outcomes:`,
      ...LOS.map(line),
      ``,
      `Lessons:`,
      ...C.lessons.map((x, l) => { const r = P.lessons[x.id]; return `- Lesson ${l + 1}, ${x.title}: ${r ? `${pct(r.score)}% after ${r.rounds} round${r.rounds > 1 ? "s" : ""}${r.passed ? "" : " (flagged)"}` : "not completed"}`; }),
      ``,
      weak.length ? `Recommended follow-up: ${weak.map((k) => A.outcomes[k].name).join(", ")}.` : `All learning outcomes achieved.`,
      `Questions answered: ${P.hist.length}, correct: ${P.hist.filter((h) => h.ok).length}.`,
    ].join("\n");
  }

  function renderSend(show) {
    const box = $("send"); if (!box) return;
    box.hidden = !show; if (!show) return;
    box.innerHTML = `
      <div class="eyebrow">Send your report to your teacher</div>
      <div><b>To:</b> ${esc(T.name)}</div>
      <label class="fld">Your name<input id="sName" autocomplete="name" value="${esc(pref.name || "")}"></label>
      <div class="row"><button class="primary" id="sMail">✉ Send report</button>${navigator.share ? '<button id="sShare">Share…</button>' : ""}<button id="sCopy">Copy report</button></div>
      <div class="muted" id="sMsg" role="status" style="font-size:15px">Opens your mail app with the report ready. Tap Send there.</div>`;
    const keep = () => { pref = { name: $("sName").value.trim() }; try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch (e) {} };
    const subject = () => `${C.code} achievement report – ${$("sName").value.trim() || "student"}`;
    $("sMail").onclick = () => {
      keep();
      if (!pref.name) { $("sMsg").textContent = "Enter your name first."; $("sName").focus(); return; }
      const to = T.email || "";
      location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(reportText(pref.name))}`;
      $("sMsg").textContent = "Your mail app should open with the report. Tap Send there.";
    };
    if ($("sShare")) $("sShare").onclick = async () => { keep(); try { await navigator.share({ title: subject(), text: reportText(pref.name) }); } catch (e) {} };
    $("sCopy").onclick = async () => {
      keep();
      try { await navigator.clipboard.writeText(reportText(pref.name)); $("sMsg").textContent = "Report copied. Paste it into any email or message."; }
      catch (e) { $("sMsg").textContent = "Couldn't copy automatically."; }
    };
  }

  function loadQuestion(st) {
    const q = allQ[st.qs[P.q]], ord = order(q), o = A.outcomes[q.lo];
    const intro = P.q === 0 ? [st.round ? "Let's practise." : `Lesson ${st.l + 1} check. ${st.qs.length} questions.`] : [];
    script = { main: intro.concat([`Question ${P.q + 1}.`, q.q], ord.map((oi, i) => `${L[i]}. ${q.o[oi]}.`)), offset: 0, q, ord };
    const n0 = intro.length + 1; // sentence index of the question text
    Scenes.loadBeats(st.round ? `<b>Practice</b> · ${esc(o.name)}` : capOf(st.l), `${P.q + 1}/${st.qs.length}`, [
      { at: 0, html: `<div class="st-kicker">Question ${P.q + 1} · ${esc(o.name)}</div><div class="st-quote" style="font-size:clamp(21px,5vw,30px)">${esc(q.q)}</div>` },
      { at: n0 + 1, html: `<div class="st-opts">${ord.map((oi, i) => `<button class="st-it st-opt" data-at="${n0 + 1 + i}" data-pos="${i}" ${oi === 0 ? 'data-right="1"' : ""}><b>${L[i]}</b><span>${esc(q.o[oi])}</span></button>`).join("")}</div>` },
      { at: 99, html: `<div class="st-kicker" id="fbk"></div><div class="st-note" style="font-size:17px;color:var(--st-ink)">${esc(q.why)}</div>` },
    ]);
    stageEl.querySelectorAll(".st-opt").forEach((b) => (b.onclick = () => answer(+b.dataset.pos)));
  }

  function answer(pos) {
    const st = cur(); if (st.kind !== "quiz" || P.part === "feedback") return;
    const q = script.q, ok = script.ord[pos] === 0;
    P.ans[q.id] = ok; P.seen[q.id] = true;
    P.hist.push({ id: q.id, lo: q.lo, ok, r: rkey(st) }); refreshMastery();
    (P.rounds[rkey(st)] = P.rounds[rkey(st)] || {})[q.id] = ok;
    P.part = "feedback"; P.sent = 0; waiting = false; save();
    stopSpeech();
    stageEl.querySelectorAll(".st-opt").forEach((b) => { b.disabled = true; b.classList.toggle("picked", +b.dataset.pos === pos && !ok); });
    const right = script.ord.indexOf(0);
    script.feedback = [ok ? "Correct." : `Not quite. The answer is ${L[right]}. ${q.o[0]}.`].concat(sentences(q.why));
    const f = stageEl.querySelector("#fbk"); f.textContent = ok ? "✓ Correct" : `✗ Answer: ${L[right]}`; f.style.color = ok ? "var(--st-good)" : "var(--st-bad)";
    stageEl.querySelectorAll(".st-opt[data-right]").forEach((b) => b.classList.add("right"));
    Scenes.step(99);
    playing = true; play();
  }

  function loadResult(st) {
    const r = roundScore(st), passed = r.score >= A.target;
    const weak = LOS.filter((k) => r.by[k] && r.by[k].c / r.by[k].n < A.target);
    const last = st.round >= A.maxRemediation;
    const id = C.lessons[st.l].id;
    if (!st.extra && (!P.lessons[id] || st.round === 0 || r.score >= (P.lessons[id].score || 0))) P.lessons[id] = { score: r.score, passed, rounds: st.round + 1 };
    st.verdict = st.extra ? "report" : passed ? "pass" : last ? "moveon" : "remediate"; st.weak = weak;
    save();
    const names = weak.map((k) => A.outcomes[k].name);
    const say = [`You answered ${r.c} out of ${r.n}. That is ${pct(r.score)} percent.`];
    if (st.extra) say.push(passed ? "That outcome is now on track." : "Keep practising. Your instructor can help.", "Here is your updated report.");
    else if (passed) say.push(st.round ? "You've reached the target. Well done." : "Great work. You've mastered this lesson.");
    else if (!last) say.push(`The target is ${pct(A.target)} percent.`, `You need more work on ${names.join(" and ")}.`, "I've prepared a short review and some practice for you.");
    else say.push("Let's move on for now.", `I've flagged ${names.join(" and ")} for review with your instructor.`);
    script = { main: say, offset: 0 };
    const rows = Object.entries(r.by).map(([k, v]) => {
      const m = v.c / v.n, cls = m >= A.target ? "good" : "bad";
      return `<div class="st-it st-lo" data-at="0"><div class="st-lo-h"><b>${esc(A.outcomes[k].name)}</b><span>${v.c}/${v.n}</span></div>
        <div class="st-lo-t"><i class="${cls}" style="--w:${pct(m)}%"></i><em style="left:${pct(A.target)}%"></em></div></div>`;
    }).join("");
    Scenes.loadBeats(st.round ? `<b>Practice result</b>` : capOf(st.l), "Result", [
      { at: 0, fx: "bars", html: `<div class="st-kicker">${st.round ? "Practice result" : `Lesson ${st.l + 1} result`}</div>
        <div class="st-score ${passed ? "good" : "bad"}"><span data-count="${pct(r.score)}" data-unit="%">0%</span><small>target ${pct(A.target)}%</small></div>` },
      { at: 0, html: `<div class="st-los">${rows}</div>` },
      { at: 1, html: st.extra ? `<div class="st-quote">${passed ? "Back <em>on track</em>." : "Keep <em>practising</em>."}</div>`
        : passed ? `<div class="st-quote">Lesson <em>mastered</em>.</div>`
        : last ? `<div class="st-quote">Flagged for <em>instructor review</em>: ${esc(names.join(", "))}</div>`
        : `<div class="st-kicker" style="color:var(--st-warm)">Your plan</div><div class="st-cards">${weak.map((k) => `<div class="st-it st-card" data-at="${say.length - 1}"><b>${esc(A.outcomes[k].name)}</b><span>Review lesson + ${Math.min(2, pickPractice(k, 2).length)} practice questions</span></div>`).join("")}</div>` },
    ]);
  }

  function loadReport() {
    const vals = LOS.map((k) => P.lo[k] ?? 0), overall = vals.reduce((a, b) => a + b, 0) / LOS.length;
    const weak = LOS.filter((k) => (P.lo[k] ?? 0) < A.target), names = weak.map((k) => A.outcomes[k].name);
    const say = ["Course complete. Here is your achievement report.", `Overall mastery: ${pct(overall)} percent.`]
      .concat(LOS.map((k) => `${A.outcomes[k].name}: ${pct(P.lo[k] ?? 0)} percent.`))
      .concat(weak.length ? [`To strengthen your learning, revisit ${names.join(" and ")}.`] : ["You achieved every learning outcome. Excellent work."]);
    script = { main: say, offset: 0 };
    Scenes.loadBeats("<b>Achievement report</b>", "", [
      { at: 0, html: `<div class="st-kicker">${esc(C.code)} · Achievement</div><h2 class="st-h">${esc(C.title)}</h2>` },
      { at: 1, fx: "bars", html: `<div class="st-score ${overall >= A.target ? "good" : "bad"}"><span data-count="${pct(overall)}" data-unit="%">0%</span><small>overall mastery</small></div>` },
      { at: 2, html: `<div class="st-los">${LOS.map((k, i) => { const m = P.lo[k] ?? 0; return `<div class="st-it st-lo" data-at="${2 + i}"><div class="st-lo-h"><b>${esc(A.outcomes[k].full)}</b><span>${pct(m)}%</span></div><div class="st-lo-t"><i class="${m >= A.target ? "good" : "bad"}" style="--w:${pct(m)}%"></i><em style="left:${pct(A.target)}%"></em></div></div>`; }).join("")}</div>` },
      { at: say.length - 1, html: weak.length ? `<div class="st-kicker" style="color:var(--st-warm)">Recommended</div><div class="st-cards">${weak.map((k) => `<button class="st-card st-go" data-lo="${k}"><b>${esc(A.outcomes[k].name)} ▶</b><span>Tap to review and practise again</span></button>`).join("")}</div>` : `<div class="st-quote">All outcomes <em>achieved</em>.</div>` },
      ...(T.sendReport ? [{ at: say.length - 1, html: `<button class="st-card st-send"><b>✉ Send this report</b><span>By email or share</span></button>` }] : []),
    ]);
    stageEl.querySelectorAll(".st-go").forEach((b) => (b.onclick = () => extraPractice(b.dataset.lo)));
    if (T.sendReport) stageEl.querySelector(".st-send").onclick = () => { pause(); const s = $("send"); if (s) { s.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => $(pref.name ? "sMail" : "sName")?.focus(), 500); } };
  }

  // From the report: one more review + practice round on a chosen outcome, then an updated report.
  function extraPractice(lo) {
    const st = cur(), round = 100 + P.idx;
    let qs = pickPractice(lo, 3);
    if (!qs.length) qs = A.practice[lo].slice(0, 3).map((q) => q.id);
    pause();
    P.queue.splice(P.idx + 1, 0, { kind: "review", lo, l: st.l }, { kind: "quiz", l: st.l, round, qs }, { kind: "result", l: st.l, round, extra: true });
    P.idx++; P.part = "main"; P.sent = 0; P.q = 0; save();
    load(); play();
  }

  // ---------- playback ----------
  function play() {
    if (view !== "player") return openPlayer();
    playing = true; waiting = false; keepAwake(); bar();
    const st = cur();
    const list = P.part === "feedback" ? script.feedback : script.main;
    if (!list) { P.part = "main"; P.sent = 0; return play(); }
    speak(list, P.sent, (i) => {
      P.sent = i; save(); caption(list[i]);
      if (P.part === "main") vstep(i - script.offset);
    }, () => {
      if (st.kind === "quiz" && P.part === "main") { // wait for a tap
        playing = false; waiting = true; P.sent = 0; save(); caption("Tap your answer."); return bar();
      }
      advance();
    });
  }

  function advance() {
    const st = cur();
    if (st.kind === "quiz" && P.q + 1 < st.qs.length) { P.q++; P.part = "main"; P.sent = 0; save(); load(); return play(); }
    if (st.kind === "result") {
      if (st.verdict === "remediate") {
        const plan = [];
        st.weak.forEach((k) => plan.push({ kind: "review", lo: k, l: st.l }));
        const qs = st.weak.flatMap((k) => pickPractice(k, 2));
        plan.push({ kind: "quiz", l: st.l, round: st.round + 1, qs }, { kind: "result", l: st.l, round: st.round + 1 });
        P.queue.splice(P.idx + 1, 0, ...plan);
      } else if (st.verdict === "report") P.queue.splice(P.idx + 1, 0, { kind: "report", l: st.l });
      else if (st.l + 1 < C.lessons.length) P.queue.push(...lessonPlan(st.l + 1));
      else P.queue.push({ kind: "report", l: st.l });
    }
    if (st.kind === "report") { playing = false; save(); return bar(); }
    P.idx++; P.part = "main"; P.sent = 0; P.q = 0; save();
    load(); play();
  }

  function pause() { playing = false; stopSpeech(); bar(); }

  $("toggle").onclick = () => {
    if (waiting) { P.sent = 0; waiting = false; return play(); } // repeat the question
    playing ? pause() : play();
  };
  $("home").onclick = () => { setFs(false); pause(); waiting = false; renderHome(); };

  // ---------- full screen ----------
  // Real Fullscreen API where allowed (Android, desktop); immersive CSS mode everywhere (iPhone Safari).
  function setFs(on) {
    if (on === document.body.classList.contains("fs")) return;
    document.body.classList.toggle("fs", on);
    $("fsBtn").textContent = on ? "✕" : "⛶";
    $("fsBtn").setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
    try {
      if (on && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
      if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch (e) {}
    setTimeout(refit, 350); // rescale and re-centre the scene for the new size
  }
  function refit() { Scenes.fit(); if (look) { fitLook(); look.step(lookStep); } }
  $("fsBtn").onclick = () => setFs(!document.body.classList.contains("fs"));
  window.addEventListener("resize", () => { if (view === "player") refit(); });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) setFs(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setFs(false); });

  // ---------- voice settings panel ----------
  function fillVoices() {
    const sel = $("vVoice"), cur = voice(), vs = enVoices();
    sel.innerHTML = vs.length ? vs.map((v) => `<option value="${esc(v.voiceURI)}" ${cur && v.voiceURI === cur.voiceURI ? "selected" : ""}>${esc(v.name.replace(/^(Microsoft|Google)\s+/, ""))} · ${esc(v.lang)}</option>`).join("")
      : "<option>Default voice</option>";
  }
  const showRate = () => { $("vRateOut").textContent = VS.rate.toFixed(2).replace(/0$/, "") + "×"; };
  // Re-speak the current sentence so a change is heard right away.
  const applyLive = () => { if (playing) play(); };
  const showPitch = () => { $("vPitchOut").textContent = VS.pitch < 0.95 ? "deeper" : VS.pitch > 1.05 ? "higher" : "normal"; };
  $("vLook").onchange = (e) => {
    VS.look = e.target.value; saveVS();
    const st = cur();
    if (view !== "player" || (st.kind !== "sec" && st.kind !== "review")) return;
    const wasPlaying = playing;
    if (wasPlaying) { stopSpeech(); }
    load();
    if (wasPlaying) play(); else vstep(P.sent - script.offset);
  };
  $("vBtn").onclick = () => { $("vLook").value = VS.look || "story"; fillVoices(); $("vRate").value = VS.rate; $("vPitch").value = VS.pitch; showRate(); showPitch(); $("vPanel").hidden = !$("vPanel").hidden; };
  $("vPitch").oninput = (e) => { VS.pitch = +e.target.value; showPitch(); };
  $("vPitch").onchange = () => { saveVS(); applyLive(); };
  $("vClose").onclick = () => ($("vPanel").hidden = true);
  $("vVoice").onchange = (e) => { VS.uri = e.target.value; saveVS(); applyLive(); };
  $("vRate").oninput = (e) => { VS.rate = +e.target.value; showRate(); };
  $("vRate").onchange = () => { saveVS(); applyLive(); };
  $("vTest").onclick = () => {
    if (playing) pause();
    speak(["Hello. This is how your lessons will sound."], 0, () => {}, () => {});
  };
  if (synth.addEventListener) synth.addEventListener("voiceschanged", () => { if (!$("vPanel").hidden) fillVoices(); });
  document.addEventListener("keydown", (e) => { if (e.code === "Space" && view === "player") { e.preventDefault(); $("toggle").click(); } });
  if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = () => {};
  window.__vl = { state: () => P, answer, advance, reportText }; // test hook

  renderHome();
})();
