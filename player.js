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
  function voice() {
    const vs = synth.getVoices().filter((v) => /^en/i.test(v.lang));
    return vs.find((v) => v.localService && /en[-_]US/i.test(v.lang)) || vs.find((v) => v.localService) || vs.find((v) => v.default) || vs[0];
  }
  // Speak list[from..] one sentence at a time; a watchdog covers mobile Chrome's lost 'end' events.
  function speak(list, from, onSentence, onDone) {
    const my = ++tok; synth.cancel();
    let i = from;
    const next = () => {
      if (my !== tok) return;
      if (i >= list.length) return onDone();
      onSentence(i);
      const u = new SpeechSynthesisUtterance(list[i]), v = voice();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
      let started = false, ended = false, quiet = 0;
      const finish = () => { if (ended || my !== tok) return; ended = true; clearInterval(dog); i++; setTimeout(next, 120); };
      const dog = setInterval(() => {
        if (my !== tok) return clearInterval(dog);
        if (document.hidden) { quiet = 0; return; } // don't skip ahead while the phone is asleep
        if (synth.speaking) { started = true; quiet = 0; return; }
        if (++quiet >= (started ? 3 : 10)) finish();
      }, 500);
      u.onstart = () => (started = true);
      u.onend = finish;
      u.onerror = (e) => { if (e.error !== "interrupted" && e.error !== "canceled") finish(); };
      synth.speak(u);
    };
    next();
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
  // Outcome mastery = share correct in the student's last 4 answers on that outcome (recent evidence, not one lucky answer).
  function refreshMastery() {
    LOS.forEach((k) => {
      const h = P.hist.filter((x) => x.lo === k).slice(-4);
      if (h.length) P.lo[k] = h.filter((x) => x.ok).length / h.length;
    });
  }
  function pickPractice(lo, k) {
    const pool = A.practice[lo].filter((q) => !P.seen[q.id]);
    const wrongCore = Object.values(A.core).flat().filter((q) => q.lo === lo && P.ans[q.id] === false);
    return pool.concat(wrongCore).slice(0, k).map((q) => q.id);
  }

  // ---------- views ----------
  const stageEl = document.createElement("div");
  Scenes.mount(stageEl);

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
    $("main").innerHTML = `<div class="player"><div id="slot"></div></div><div class="cc" id="cc"></div>`;
    $("slot").replaceWith(stageEl);
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
      script = { main: intro.concat(sentences(sec.script)), offset: intro.length };
      Scenes.load(st.l, st.s, true);
    } else if (st.kind === "review") {
      const r = A.review[st.lo];
      script = { main: [`Review. ${r.title}.`].concat(sentences(r.script)), offset: 1 };
      Scenes.loadBeats(`<b>Review</b> · ${esc(A.outcomes[st.lo].full)}`, "", r.beats);
    } else if (st.kind === "quiz") loadQuestion(st);
    else if (st.kind === "result") loadResult(st);
    else if (st.kind === "report") loadReport();
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
    P.hist.push({ id: q.id, lo: q.lo, ok }); refreshMastery();
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
    ]);
    stageEl.querySelectorAll(".st-go").forEach((b) => (b.onclick = () => extraPractice(b.dataset.lo)));
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
      if (P.part === "main") Scenes.step(Math.max(0, i - script.offset));
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
  $("home").onclick = () => { pause(); waiting = false; renderHome(); };
  document.addEventListener("keydown", (e) => { if (e.code === "Space" && view === "player") { e.preventDefault(); $("toggle").click(); } });
  if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = () => {};
  window.__vl = { state: () => P, answer, advance }; // test hook

  renderHome();
})();
