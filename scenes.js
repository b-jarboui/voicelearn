// Animated lesson scenes, synced to narration by sentence index (`at`).
// API: Scenes.mount(el); Scenes.load(lessonIdx, sectionIdx); Scenes.step(sentenceIdx); Scenes.showAll()
(() => {
  const I = { // tiny inline icons (stroke = currentColor)
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    eq: '<path d="M5 9h14M5 15h14"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    one: '<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M11 9l2-1v8"/>',
    link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
    gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>',
    chart: '<path d="M5 19V9M10 19V5M15 19v-7M20 19v-4"/>',
    users: '<circle cx="9" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M17 19a6 6 0 0 0-2-4"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    dash: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 15l3-3 3 2 4-5"/>',
    brain: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    audit: '<path d="M7 3h7l4 4v14H7z"/><path d="M10 12h5M10 16h5M14 3v4h4"/>',
  };
  const ic = (k) => `<div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg></div>`;
  const arrow = '<div class="arrow"><svg viewBox="0 0 16 30"><path d="M8 2v24M2 20l6 7 6-7"/></svg></div>';

  // ---- scene library: key = lessonId:sectionIndex. Each beat has `at` (sentence index) and HTML; items inside carry data-at.
  const it = (at, html, cls = "") => `<div class="st-it ${cls}" data-at="${at}">${html}</div>`;
  const S = {
    "l1:0": [
      { at: 0, html: `<div class="st-kicker">PHQE820 · Big Data Analytics</div><h2 class="st-h">Introduction to Data Quality</h2><div class="st-sub">Week 2 · Preparatory analytics & robust quality</div>` },
      { at: 1, html: `<div class="st-kicker">By the end you will</div><div class="st-list">
        ${it(2, "<div><b>Define</b><span>Data quality as fitness for purpose</span></div>")}
        ${it(3, "<div><b>Diagnose</b><span>Common dimensions and problems in real datasets</span></div>")}
        ${it(4, "<div><b>Prepare</b><span>Preparatory analytics before any machine learning</span></div>")}
        ${it(5, "<div><b>Integrate</b><span>Link data quality to robust quality</span></div>")}</div>` },
    ],
    "l1:1": [
      { at: 0, html: `<div class="st-kicker">One key message</div>` },
      { at: 1, html: `<div class="st-quote">If the data is not <em>trustworthy</em>, the outcome fails.</div>` },
      { at: 2, html: `<div class="st-row">${it(2, '<span class="st-chips"><i>Not optional</i></span>')}${it(3, '<span class="st-chips"><i>Foundation of robust decisions</i></span>')}</div>` },
      { at: 4, html: `<div class="st-kicker" style="color:var(--st-bad)">Poor data quality → a chain of failures</div><div class="st-chain">
        ${it(5, "Quality measurement is incorrect", "bad")}${arrow}
        ${it(6, "Analytics results are misleading", "bad")}${arrow}
        ${it(7, "Improvement decisions are wrong", "bad")}</div>` },
    ],
    "l1:2": [
      { at: 0, html: `<div class="st-kicker">Key vocabulary</div><h2 class="st-h">Five terms</h2>` },
      { at: 1, html: `<div class="st-cards">
        ${it(1, `${ic("target")}<b>Data quality</b><span>Degree to which data is fit for its intended purpose</span>`, "st-card")}
        ${it(2, `${ic("users")}<b>Measurement system</b><span>People, tools and methods that generate data</span>`, "st-card")}
        ${it(3, `${ic("gauge")}<b>KPI</b><span>A measurable value used to evaluate performance</span>`, "st-card")}
        ${it(4, `${ic("flask")}<b>Preparatory analytics</b><span>Work done before modelling to assess data health</span>`, "st-card")}
        ${it(5, `${ic("layers")}<b>Robust quality</b><span>Process + data + analytics quality, measured together</span>`, "st-card")}</div>` },
    ],
    "l2:0": [
      { at: 0, html: `<div class="st-quote">Data quality ≠ <em>clean data</em></div>` },
      { at: 1, html: `<div class="st-kicker">It is fitness for purpose</div><div class="st-sub">Good enough for a specific goal. Different goals, different needs.</div>` },
      { at: 3, html: `<div class="st-cards">
        ${it(3, `${ic("dash")}<b>Dashboard</b><span class="st-chips"><i>Timeliness</i><i>Consistency</i></span>`, "st-card")}
        ${it(4, `${ic("brain")}<b>Predictive model</b><span class="st-chips"><i>Accurate labels</i><i>Stability</i></span>`, "st-card")}
        ${it(5, `${ic("audit")}<b>Quality audit</b><span class="st-chips"><i>Complete</i><i>Traceable</i></span>`, "st-card")}</div>` },
    ],
    "l2:1": [
      { at: 0, html: `<div class="st-kicker">Core dimensions</div><h2 class="st-h">Six ways data can fail</h2>` },
      { at: 1, html: `<div class="st-cards">
        ${it(1, `${ic("target")}<b>Accuracy</b><span>Values reflect reality</span>`, "st-card")}
        ${it(2, `${ic("check")}<b>Completeness</b><span>Required fields present</span>`, "st-card")}
        ${it(3, `${ic("eq")}<b>Consistency</b><span>No contradictions</span>`, "st-card")}
        ${it(4, `${ic("clock")}<b>Timeliness</b><span>Available when needed</span>`, "st-card")}
        ${it(5, `${ic("one")}<b>Uniqueness</b><span>No duplicated entities</span>`, "st-card")}
        ${it(6, `${ic("link")}<b>Integrity</b><span>Correct relationships</span>`, "st-card")}</div>` },
    ],
    "l3:0": [
      { at: 0, html: `<div class="st-kicker">Dimensions in practice</div><h2 class="st-h">What failure looks like</h2>` },
      { at: 1, fx: "bars", html: `<div class="st-kicker">Accuracy</div><div class="st-compare">
        <div class="st-col bad"><div class="val" data-count="95">0°C</div><div class="bar" data-h="95"></div><div class="lab">Sensor reads</div></div>
        <div class="st-col good"><div class="val" data-count="75">0°C</div><div class="bar" data-h="75"></div><div class="lab">True temperature</div></div></div>` },
      { at: 2, fx: "donut", html: `<div class="st-kicker">Completeness</div><div class="st-donut">
        <svg viewBox="0 0 120 120"><circle class="trk" cx="60" cy="60" r="48"/><circle class="arc" cx="60" cy="60" r="48" stroke-dasharray="301.6" stroke-dashoffset="301.6" data-pct="20"/></svg>
        <div><div class="big" data-count="20" data-unit="%">0%</div><div class="st-note">of customer delivery times<br>missing from the logs</div></div></div>` },
      { at: 3, html: `<div class="st-kicker">Consistency</div><div class="st-pair">
        <div class="box"><small>ERP · ID 4471</small>Valve, steel 2"</div><div class="rel">≠</div>
        <div class="box"><small>CRM · ID 4471</small>Steel valve 50mm</div></div><div class="st-note" style="margin-top:8px">Same product ID, two different names</div>` },
    ],
    "l3:1": [
      { at: 0, html: `<div class="st-kicker">Timeliness</div><div class="st-time"><div class="line"></div><div class="fill"></div>
        <div class="pt" style="left:calc(8% - 11px)"></div><div class="pt" style="left:calc(92% - 11px)"></div>
        <div class="mid">10 days</div><div class="lab" style="left:8%">Event</div><div class="lab" style="left:92%">Complaint arrives</div></div>` },
      { at: 1, html: `<div class="st-kicker">Validity</div><div class="st-record">
        <div>patient_id: P-20931</div><div>arrived: 09:40</div><div>seen: 09:25</div><div class="bad">waiting_time: −15 min</div>
        <div class="st-stamp">IMPOSSIBLE</div></div>` },
      { at: 2, html: `<div class="st-kicker">Integrity</div><div class="st-pair">
        <div class="box"><small>Order</small>#88213 → customer C-5502</div><div class="rel">?</div>
        <div class="box"><small>Customers</small>C-5502 not found</div></div>` },
      { at: 3, html: `<div class="st-kicker">Validity rules</div><div class="st-chips">${it(3, "<i>Ranges</i>")}${it(3, "<i>Formats</i>")}${it(3, "<i>Allowed codes</i>")}</div>` },
    ],
    "l4:0": [
      { at: 0, html: `<div class="st-kicker">Before any model</div><h2 class="st-h">Preparatory analytics</h2>` },
      { at: 1, fx: "pipe", html: `<div class="st-pipe"><div class="prog"></div>
        ${it(1, "<b>Understanding</b><span>Meaning, units, data sources</span>", "")}
        ${it(2, "<b>Profiling</b><span>Missing values, outliers, errors</span>", "")}
        ${it(3, "<b>Cleaning</b><span>Impute, standardise formats</span>", "")}
        ${it(4, "<b>Integration</b><span>Merge ERP, IoT, CRM correctly</span>", "")}
        ${it(5, "<b>Validation</b><span>Domain expert + data dictionary</span>", "")}</div>` },
    ],
    "l4:1": [
      { at: 0, html: `<div class="st-kicker">A closer look</div><h2 class="st-h">Profiling & integration</h2>` },
      { at: 1, html: `<div class="st-kicker">Profiling is diagnostic</div><div class="st-minis">
        ${it(2, `<small>Missing values</small><svg viewBox="0 0 100 60">${[30, 12, 45, 8, 22, 5].map((h, i) => `<rect x="${4 + i * 16}" y="${60 - h}" width="11" height="${h}" rx="2" fill="${i === 2 ? "#FF6B6B" : "#6C9BFF"}"/>`).join("")}</svg>`, "st-mini")}
        ${it(2, `<small>Distribution</small><svg viewBox="0 0 100 60"><path class="draw" d="M2 58 C25 58 30 8 50 8 S75 58 98 58"/></svg>`, "st-mini")}
        ${it(2, `<small>Drift over time</small><svg viewBox="0 0 100 60"><path class="draw" d="M2 45 L18 42 L34 44 L50 36 L66 30 L82 20 L98 12"/></svg>`, "st-mini")}</div>` },
      { at: 3, html: `<div class="st-kicker" style="color:var(--st-bad)">Integration: where projects go wrong</div><div class="st-merge">
        <div class="srcs"><div class="src">ERP</div><div class="src">IoT</div><div class="src">Machine logs</div></div>
        <svg viewBox="0 0 60 130"><path d="M0 20 C30 20 30 65 60 65M0 65 H60M0 110 C30 110 30 65 60 65"/></svg>
        <div class="out">Merged data</div></div>
        <div class="st-chips" style="margin-top:10px">${it(4, "<i>Wrong joins</i>")}${it(4, "<i>Mismatched keys</i>")}${it(4, "<i>Time misalignment</i>")}</div>` },
    ],
    "l5:0": [
      { at: 0, html: `<div class="st-kicker">Case study</div><h2 class="st-h">Can data quality distort reality?</h2>` },
      { at: 1, fx: "tags", html: `<div class="st-kicker">Reported defect rate</div><div class="st-frac">
        <div>Defects <span class="tag down">night shift missing</span></div><hr><div>Total units <span class="tag up">duplicates</span></div></div>` },
      { at: 3, html: `<div class="st-vs">
        ${it(3, '<div class="box good"><div class="arr">↓</div><b>Reported rate</b><span class="st-note">Looks better</span></div>')}
        ${it(4, '<div class="box bad"><div class="arr">↑</div><b>Reality</b><span class="st-note">Actually worse</span></div>')}</div>` },
    ],
    "l5:1": [
      { at: 0, html: `<div class="st-kicker">Case study · logistics</div><h2 class="st-h">Predicting late deliveries</h2>
        <div class="st-chips" style="margin-top:8px"><i>GPS</i><i>Traffic</i><i>Scans</i></div>` },
      { at: 0, fx: "route", html: `<div class="st-route"><svg viewBox="0 0 340 150">
        <path class="path" d="M15 120 C80 120 70 30 150 40 S240 120 325 30"/>
        <path class="live" d="M15 120 C80 120 70 30 150 40 S240 120 325 30"/>
        ${[[15, 120], [60, 105], [95, 60], [150, 40], [200, 62], [240, 98], [285, 70], [325, 30]].map(([x, y], i) => `<circle class="dot ${i === 2 || i === 5 ? "miss" : ""}" cx="${x}" cy="${y}" r="6"/>${i === 2 || i === 5 ? `<circle class="gone" cx="${x}" cy="${y}" r="9"/>` : ""}`).join("")}
        </svg></div>` },
      { at: 1, html: `<div class="st-cards">
        ${it(1, `${ic("target")}<b>Missing GPS points</b>`, "st-card")}
        ${it(1, `${ic("clock")}<b>Delayed scans</b>`, "st-card")}
        ${it(1, `${ic("one")}<b>Duplicate IDs</b>`, "st-card")}</div>` },
      { at: 2, html: `<div class="st-quote">The model learns <em>noise</em>, not patterns.</div><div class="st-note" style="margin-top:6px">→ incorrect optimisation alerts</div>` },
    ],
    "l5:2": [
      { at: 1, html: `<div class="st-stack">
        ${it(2, "Robust quality", "crown")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${it(2, "Process quality", "top")}${it(2, "Analytics quality", "top")}</div>
        ${it(1, "Data quality", "base")}</div>` },
      { at: 3, html: `<div class="st-kicker">Up next</div><div class="st-cards">
        ${it(4, `${ic("users")}<b>Spoken reflection</b><span>About one minute</span>`, "st-card")}
        ${it(4, `${ic("audit")}<b>Written assignment</b><span>300–500 words, by voice</span>`, "st-card")}</div>` },
    ],
  };

  // ---------- engine ----------
  let root, track, bar, cap, beats = [], items = [], max = 0, cur = -1;
  const C = () => window.COURSE;

  function mount(el) {
    root = el; root.classList.add("stage");
    root.innerHTML = `<div class="st-cap"><span id="stCapL"></span><span id="stCapR"></span></div><div class="st-fade t"></div>
      <div class="st-track"></div><div class="st-fade b"></div><div class="st-bar"></div>`;
    track = root.querySelector(".st-track"); bar = root.querySelector(".st-bar");
  }

  let lastKey = "";
  function load(l, s, force) {
    if (!root) return;
    if (!force && lastKey === `${l}:${s}`) return;
    lastKey = `${l}:${s}`;
    const L = C().lessons[l], sec = L.sections[s];
    const scene = S[`${L.id}:${s}`] || [{ at: 0, html: `<div class="st-kicker">Lesson ${l + 1}</div><h2 class="st-h">${sec.title}</h2>` }];
    root.querySelector("#stCapL").innerHTML = `<b>Lesson ${l + 1}</b> · ${L.title}`;
    root.querySelector("#stCapR").textContent = `${s + 1}/${L.sections.length}`;
    track.style.transition = "none"; track.style.transform = "translateY(0)";
    track.innerHTML = scene.map((b, i) => `<section class="st-beat" data-at="${b.at}" data-fx="${b.fx || ""}" data-i="${i}">${b.html}</section>`).join("");
    void track.offsetHeight; track.style.transition = "";
    beats = [...track.querySelectorAll(".st-beat")];
    items = [...track.querySelectorAll(".st-it")];
    max = Math.max(...[...track.querySelectorAll("[data-at]")].map((e) => +e.dataset.at), 1);
    cur = -1; bar.style.width = "0";
  }

  function countUp(el) {
    const to = +el.dataset.count, unit = el.dataset.unit ?? "°C", t0 = performance.now();
    const f = (t) => { const p = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e) + unit; if (p < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  function fx(b) {
    if (b.dataset.done) return; b.dataset.done = 1;
    const k = b.dataset.fx;
    setTimeout(() => {
      b.querySelectorAll("[data-count]").forEach(countUp);
      if (k === "bars") b.querySelectorAll(".bar").forEach((x) => (x.style.height = (+x.dataset.h * 1.6) + "px"));
      if (k === "donut") b.querySelectorAll(".arc").forEach((x) => (x.style.strokeDashoffset = 301.6 * (1 - +x.dataset.pct / 100)));
      if (k === "tags") b.querySelector(".st-frac").classList.add("show-tags");
      if (k === "route") setTimeout(() => b.querySelector(".st-route").classList.add("broken"), 1500);
    }, 350);
  }

  function step(i) {
    if (!root || !beats.length) return;
    cur = Math.max(cur, i);
    let last = null;
    beats.forEach((b) => { if (+b.dataset.at <= cur) { if (!b.classList.contains("in")) { b.classList.add("in"); fx(b); } last = b; } });
    let newest = null;
    items.forEach((x) => { if (+x.dataset.at <= cur && !x.classList.contains("in")) { x.classList.add("in"); newest = x; if (x.classList.contains("st-card")) setTimeout(() => x.classList.add("settled"), 1600); } });
    // pipeline progress line follows the newest step
    track.querySelectorAll(".st-pipe").forEach((p) => {
      const on = [...p.querySelectorAll(".st-it.in")].pop(); const prog = p.querySelector(".prog");
      if (on && prog) prog.style.height = on.offsetTop + 18 + "px";
    });
    // focus: dim older beats, glide the newest item to the middle of the frame
    beats.forEach((b) => b.classList.toggle("dim", b.classList.contains("in") && b !== last && beats.indexOf(b) < beats.indexOf(last) - 1));
    const focus = newest && last && last.contains(newest) ? newest : last;
    if (focus) {
      const top = focus.getBoundingClientRect().top - track.getBoundingClientRect().top;
      const y = Math.max(0, top + focus.offsetHeight / 2 - root.clientHeight * 0.45);
      track.style.transform = `translateY(${-y}px)`;
    }
    bar.style.width = Math.min(100, ((cur + 1) / (max + 1)) * 100) + "%";
  }

  function showAll() { step(99); }

  window.Scenes = { mount, load, step, showAll };
})();
