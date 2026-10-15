// Style: Kinetic type — one idea per screen, huge words that punch in, a new colour field for every beat.
(() => {
  const css = `
  .sk{position:absolute;inset:0;overflow:hidden;font-family:"Atkinson Hyperlegible",system-ui,sans-serif;background:#111}
  .sk-slide{position:absolute;inset:0;padding:64px 26px 40px;display:flex;flex-direction:column;justify-content:center;gap:14px;
    transform:translateY(100%);transition:transform .9s cubic-bezier(.7,0,.2,1)}
  .sk-slide.now{transform:none} .sk-slide.past{transform:translateY(-30%) scale(.92);opacity:.0;transition:transform .9s cubic-bezier(.7,0,.2,1),opacity .9s}
  .sk-big{font-family:Anton,Impact,sans-serif;text-transform:uppercase;line-height:.92;letter-spacing:.005em;margin:0}
  .sk-w{display:inline-block;overflow:hidden;vertical-align:top;padding-right:.18em}
  .sk-w > span{display:inline-block;transform:translateY(105%);transition:transform .7s cubic-bezier(.2,.9,.2,1) var(--d,0s)}
  .now .sk-w > span{transform:none}
  .sk-k{font:700 12px system-ui;letter-spacing:.16em;text-transform:uppercase;opacity:.75}
  .sk-sm{font-size:19px;line-height:1.35;max-width:22ch;opacity:0;transform:translateY(12px);transition:all .6s .45s}
  .now .sk-sm{opacity:.9;transform:none}
  .sk-num{position:absolute;right:-6px;top:30px;font:400 190px/1 Anton,Impact,sans-serif;color:transparent;-webkit-text-stroke:2px currentColor;opacity:.22;
    transform:translateX(40px);transition:transform 1.2s cubic-bezier(.2,.9,.2,1)}
  .now .sk-num{transform:none}
  .sk-dots{display:flex;gap:6px;margin-top:6px} .sk-dots i{width:22px;height:5px;border-radius:9px;background:currentColor;opacity:.25}
  .sk-dots i.f{opacity:1}
  .sk-rule{height:6px;background:currentColor;width:100%;transform:scaleX(0);transform-origin:left;transition:transform .8s .35s cubic-bezier(.7,0,.2,1)}
  .now .sk-rule{transform:none}
  .sk-iss{display:grid;gap:10px}
  .sk-iss > div{display:flex;justify-content:space-between;align-items:center;gap:10px;font:400 26px/1 Anton,Impact,sans-serif;text-transform:uppercase;
    transform:translateX(-110%);transition:transform .7s cubic-bezier(.2,.9,.2,1) var(--d)}
  .now .sk-iss > div{transform:none}
  .sk-iss b{font:700 13px system-ui;padding:4px 8px;border-radius:99px;background:currentColor;white-space:nowrap}
  .sk-iss b span{filter:invert(1)}
  .sk-arrow{font:400 150px/0.8 Anton,Impact,sans-serif;transform:scale(.3) rotate(-20deg);opacity:0;transition:all .8s cubic-bezier(.3,1.6,.5,1) .2s}
  .now .sk-arrow{transform:none;opacity:1}
  .sk-cap{position:absolute;top:14px;left:18px;right:18px;z-index:5;font:700 11px system-ui;letter-spacing:.14em;text-transform:uppercase;color:#fff;mix-blend-mode:difference}
  @media (prefers-reduced-motion:reduce){.sk *{transition:none!important}}`;
  const st = document.createElement("style"); st.textContent = LAB.k(css); document.head.appendChild(st);

  const PAL = [["#1238FF", "#fff"], ["#FF4D2E", "#1a0a05"], ["#F2EFE6", "#141414"], ["#141414", "#F5F1E8"], ["#FFC93C", "#1d1600"], ["#0E8F6E", "#F3FFF9"]];
  const words = (t, base = 0, step = 0.07) => t.split(" ").map((w, i) => `<span class="sk-w"><span style="--d:${(base + i * step).toFixed(2)}s">${w}</span></span>`).join(" ");
  const fit = (t, max = 84) => `font-size:${Math.max(38, Math.min(max, Math.round(560 / Math.max(6, t.length))))}px`;

  let root, slides = [], keys = [];
  function slideHtml(ms) {
    const m = ms[0];
    if (m.type === "title") return `<div class="sk-num">${m.count || ""}</div><div class="sk-k">${m.kicker}</div><h2 class="sk-big" style="${fit(m.text, 72)}">${words(m.text)}</h2>`;
    if (m.type === "item") return `<div class="sk-num">${String(m.n).padStart(2, "0")}</div><div class="sk-k">${m.n} of ${m.of}</div>
      <h2 class="sk-big" style="${fit(m.title, 76)}">${words(m.title)}</h2><div class="sk-sm">${m.text}</div>
      <div class="sk-dots">${Array.from({ length: m.of }, (_, k) => `<i class="${k < m.n ? "f" : ""}"></i>`).join("")}</div>`;
    if (m.type === "question") return `<div class="sk-num" style="font-size:300px;top:0">?</div><h2 class="sk-big" style="${fit(m.text, 60)}">${words(m.text)}</h2>`;
    if (m.type === "formula") return `<div class="sk-k">${m.label}</div><h2 class="sk-big" style="font-size:64px">${words(m.num)}</h2><div class="sk-rule"></div><h2 class="sk-big" style="font-size:64px">${words(m.den, .4)}</h2>`;
    if (m.type === "issue") return `<div class="sk-k">What went wrong</div><div class="sk-iss">${ms.map((x, k) => `<div style="--d:${(k * 0.35).toFixed(2)}s"><span>${x.text}</span><b><span>${x.effect}</span></b></div>`).join("")}</div>`;
    if (m.type === "compare") {
      const stmt = ms.find((x) => x.type === "statement");
      return `<div class="sk-arrow">${m.dir === "down" ? "↓" : "↑"}</div><div class="sk-k">${m.label}</div><h2 class="sk-big" style="font-size:66px">${words(m.note, .3)}</h2>
        ${stmt ? `<div class="sk-sm" style="transition-delay:1.1s">${stmt.text}</div>` : ""}`;
    }
    if (m.type === "statement") return `<h2 class="sk-big" style="${fit(m.text, 56)}">${words(m.text)}</h2>`;
    return `<h2 class="sk-big">${words(m.text || "")}</h2>`;
  }
  STYLES.push({
    id: "kinetic", name: "Kinetic type", note: "One idea per screen. Huge words punch in and every beat gets a new colour, like a motion-graphics video.",
    mount(el) { root = el; root.innerHTML = `<div class="sk"><div class="sk-cap"></div></div>`; },
    load(sec) {
      const box = root.querySelector(".sk"); box.querySelectorAll(".sk-slide").forEach((s) => s.remove());
      root.querySelector(".sk-cap").textContent = sec.lesson;
      const groups = new Map(); sec.moments.forEach((m) => { if (!groups.has(m.at)) groups.set(m.at, []); groups.get(m.at).push(m); });
      keys = [-1, ...groups.keys()];
      const cover = [{ type: "title", kicker: sec.lesson, text: sec.title }];
      slides = keys.map((k, idx) => {
        const s = document.createElement("div"); const [bg, fg] = PAL[idx % PAL.length];
        s.className = "sk-slide"; s.style.background = bg; s.style.color = fg;
        s.innerHTML = LAB.k(slideHtml(k === -1 ? cover : groups.get(k))); box.appendChild(s); return s;
      });
    },
    step(i) {
      let cur = 0; keys.forEach((k, idx) => { if (k <= i) cur = idx; });
      slides.forEach((s, idx) => { s.classList.toggle("now", idx === cur); s.classList.toggle("past", idx < cur); });
    },
  });
})();
