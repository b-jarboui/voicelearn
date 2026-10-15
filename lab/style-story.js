// Style: Story cards (GSAP) — full-screen cards like social "stories": progress segments on top,
// each beat turns in like a cube face, then its content plays a short choreographed timeline.
(() => {
  const css = `
  .ss{position:absolute;inset:0;overflow:hidden;perspective:1100px;background:#0c0c10;font-family:"Atkinson Hyperlegible",system-ui,sans-serif;color:#fff}
  .ss-seg{position:absolute;top:10px;left:10px;right:10px;display:flex;gap:4px;z-index:5}
  .ss-seg i{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.3);overflow:hidden;position:relative}
  .ss-seg i b{position:absolute;inset:0;width:0;background:#fff}
  .ss-cap{position:absolute;top:22px;left:14px;right:14px;z-index:5;display:flex;align-items:center;gap:8px;font:700 13px system-ui}
  .ss-cap .av{width:26px;height:26px;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center;font:800 12px "Bricolage Grotesque"}
  .ss-cap span{opacity:.85}
  .ss-card{position:absolute;inset:0;padding:78px 26px 36px;display:flex;flex-direction:column;justify-content:center;gap:16px;
    backface-visibility:hidden;transform-origin:left center;visibility:hidden}
  .ss-card.now{visibility:visible}
  .ss h2{font:800 clamp(30px,9vw,46px)/1.02 "Bricolage Grotesque",system-ui;margin:0;letter-spacing:-.01em}
  .ss .ch{display:inline-block;will-change:transform}
  .ss .k{font:700 12px system-ui;letter-spacing:.14em;text-transform:uppercase;opacity:.8}
  .ss .p{font-size:19px;line-height:1.35;opacity:.92;max-width:24ch}
  .ss .ring{width:112px;height:112px;position:relative;display:grid;place-items:center}
  .ss .ring svg.r{position:absolute;inset:0;transform:rotate(-90deg)}
  .ss .ring svg.r circle{fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round}
  .ss .ring .ic{width:46px;height:46px;color:#fff}
  .ss .cnt{position:absolute;right:22px;bottom:30px;font:800 64px/1 "Bricolage Grotesque";opacity:.25;font-variant-numeric:tabular-nums}
  .ss .bigq{font:800 220px/0.8 "Bricolage Grotesque";opacity:.18;position:absolute;right:10px;top:70px}
  .ss .frac{display:grid;justify-items:start;gap:8px;font:800 44px/1 "Bricolage Grotesque"}
  .ss .frac .bar{height:6px;width:100%;background:#fff;border-radius:6px;transform-origin:left}
  .ss .chips{display:grid;gap:10px}
  .ss .chip{display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(255,255,255,.14);backdrop-filter:blur(6px);
    border:1px solid rgba(255,255,255,.25);border-radius:16px;padding:12px 14px;font-size:17px}
  .ss .chip b{background:#fff;color:#111;border-radius:99px;padding:3px 9px;font-size:13px;white-space:nowrap}
  .ss .arr{font:800 130px/0.8 "Bricolage Grotesque";display:inline-block}
  .ss .stmt{font:800 24px/1.2 "Bricolage Grotesque";border-left:4px solid #fff;padding-left:12px}`;
  const st = document.createElement("style"); st.textContent = LAB.k(css); document.head.appendChild(st);

  // Rich duotone backgrounds, one per card.
  const BG = ["linear-gradient(160deg,#0F5257 0%,#0B2B40 100%)", "linear-gradient(160deg,#E2552D 0%,#8C1C3E 100%)", "linear-gradient(160deg,#1C3FAA 0%,#0A1340 100%)",
    "linear-gradient(160deg,#2E7D4F 0%,#0F3325 100%)", "linear-gradient(160deg,#B8325E 0%,#3A0F35 100%)", "linear-gradient(160deg,#D99A1E 0%,#7A3A05 100%)", "linear-gradient(160deg,#334155 0%,#0B1120 100%)"];
  const chars = (t) => t.split(" ").map((w) => `<span style="display:inline-block;white-space:nowrap">${[...w].map((c) => `<span class="ch">${c}</span>`).join("")}</span>`).join(" ");
  const G = () => window.gsap;

  function cardHtml(ms, sec) {
    const m = ms[0];
    if (m.cover) return `<div class="k">${sec.lesson}</div><h2>${chars(sec.title)}</h2><div class="p">Tap play and listen.</div>`;
    switch (m.type) {
      case "title": return `<div class="k">${m.kicker}</div><h2>${chars(m.text)}</h2>${m.count ? `<div class="cnt" data-count="${m.count}">0</div>` : ""}`;
      case "item": return `<div class="ring"><svg class="r" viewBox="0 0 112 112"><circle cx="56" cy="56" r="50" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>${LAB.icon(m.icon, "ic")}</div>
        <div class="k">${m.n} of ${m.of}</div><h2>${chars(m.title)}</h2><div class="p">${m.text}</div><div class="cnt">${String(m.n).padStart(2, "0")}</div>`;
      case "question": return `<div class="bigq">?</div><h2>${chars(m.text)}</h2>`;
      case "formula": return `<div class="k">${m.label}</div><div class="frac"><div class="num">${m.num}</div><div class="bar"></div><div class="den">${m.den}</div></div>`;
      case "issue": return `<div class="k">What went wrong</div><div class="chips">${ms.map((x) => `<div class="chip"><span>${x.text}</span><b>${x.effect}</b></div>`).join("")}</div>`;
      case "compare": { const s = ms.find((x) => x.type === "statement");
        return `<div class="arr">${m.dir === "down" ? "↓" : "↑"}</div><div class="k">${m.label}</div><h2>${chars(m.note)}</h2>${s ? `<div class="stmt">${s.text}</div>` : ""}`; }
      case "statement": return `<div class="stmt">${m.text}</div>`;
      default: return `<h2>${chars(m.text || "")}</h2>`;
    }
  }
  // Each card's entrance choreography.
  function intro(card) {
    const g = G(); if (!g) return;
    const tl = g.timeline({ defaults: { ease: "power3.out" } });
    tl.from(card.querySelectorAll(".k"), { y: 14, opacity: 0, duration: .45 }, .15);
    const ch = card.querySelectorAll(".ch");
    if (ch.length) tl.from(ch, { yPercent: 120, rotate: 12, opacity: 0, duration: .55, stagger: .025, ease: "back.out(2)" }, .25);
    card.querySelectorAll(".ring").forEach((r) => {
      tl.from(r, { scale: 0, rotate: -40, duration: .9, ease: "elastic.out(1,.5)" }, .1);
      tl.to(r.querySelector("circle"), { attr: { "stroke-dashoffset": 0 }, duration: 1.2, ease: "power2.inOut" }, .3);
    });
    tl.from(card.querySelectorAll(".p"), { y: 20, opacity: 0, duration: .6 }, .7);
    card.querySelectorAll(".cnt").forEach((c) => {
      tl.from(c, { x: 60, opacity: 0, duration: .8 }, .2);
      if (c.dataset.count) { const o = { v: 0 }; tl.to(o, { v: +c.dataset.count, duration: 1.2, ease: "power1.out", onUpdate: () => (c.textContent = Math.round(o.v)) }, .4); }
    });
    tl.from(card.querySelectorAll(".bigq"), { scale: .2, rotate: -30, opacity: 0, duration: 1, ease: "elastic.out(1,.4)" }, .1);
    tl.from(card.querySelectorAll(".num"), { y: -60, opacity: 0, duration: .6, ease: "bounce.out" }, .2)
      .from(card.querySelectorAll(".frac .bar"), { scaleX: 0, duration: .6, ease: "power4.inOut" }, .6)
      .from(card.querySelectorAll(".den"), { y: 60, opacity: 0, duration: .6, ease: "bounce.out" }, .9);
    card.querySelectorAll(".chip").forEach((c, k) => {
      tl.from(c, { x: k % 2 ? 260 : -260, rotate: k % 2 ? 8 : -8, opacity: 0, duration: .7, ease: "back.out(1.6)" }, .3 + k * 1.1);
      tl.from(c.querySelector("b"), { scale: 2.6, opacity: 0, duration: .45, ease: "back.out(3)" }, .8 + k * 1.1);
    });
    tl.from(card.querySelectorAll(".arr"), { y: (i, el) => (el.textContent === "↓" ? -120 : 120), opacity: 0, duration: 1, ease: "bounce.out" }, .1);
    tl.from(card.querySelectorAll(".stmt"), { x: -30, opacity: 0, duration: .7 }, 1.2);
  }

  let root, cards = [], keys = [], cur = -1, segs = [], sec;
  STYLES.push({
    id: "story", name: "Story cards", note: "Full-screen cards like social media stories. Each beat turns in like a cube and plays its own little animation (GSAP).",
    mount(el) { root = el; root.innerHTML = `<div class="ss"><div class="ss-seg"></div><div class="ss-cap"><div class="av">VL</div><span></span></div></div>`; },
    load(s) {
      sec = s; const box = root.querySelector(".ss"); box.querySelectorAll(".ss-card").forEach((c) => c.remove());
      root.querySelector(".ss-cap span").textContent = s.lesson;
      root.querySelector(".ss-seg").innerHTML = s.sentences.map(() => "<i><b></b></i>").join(""); segs = [...root.querySelectorAll(".ss-seg b")];
      const groups = new Map(); s.moments.forEach((m) => { if (!groups.has(m.at)) groups.set(m.at, []); groups.get(m.at).push(m); });
      keys = [-1, ...groups.keys()];
      cards = keys.map((k, idx) => { const c = document.createElement("div"); c.className = "ss-card"; c.style.background = BG[idx % BG.length];
        c.innerHTML = cardHtml(k === -1 ? [{ cover: true }] : groups.get(k), s); box.appendChild(c); return c; });
      cur = -1;
    },
    step(i) {
      // progress segments: done ones full, current one fills over an estimate of the sentence length
      segs.forEach((b, k) => { const g = G(); if (g) g.killTweensOf(b);
        if (k < i) b.style.width = "100%"; else if (k > i) b.style.width = "0";
        else { b.style.width = "0"; const dur = Math.max(1.5, sec.sentences[k].split(" ").length * .36); g ? g.to(b, { width: "100%", duration: dur, ease: "none" }) : (b.style.width = "100%"); } });
      let n = 0; keys.forEach((k, idx) => { if (k <= i) n = idx; });
      if (n === cur) return;
      const g = G(), prev = cards[cur], next = cards[n];
      cards.forEach((c) => c !== prev && c !== next && c.classList.remove("now"));
      next.classList.add("now");
      if (g && prev && n > cur) {
        g.set(next, { rotateY: 90, transformOrigin: "left center", x: 0 });
        g.timeline().to(prev, { rotateY: -90, transformOrigin: "right center", duration: .7, ease: "power2.in" }, 0)
          .to(next, { rotateY: 0, duration: .8, ease: "power2.out" }, .35)
          .add(() => { prev.classList.remove("now"); g.set(prev, { rotateY: 0 }); }, 1.2);
      } else if (prev) prev.classList.remove("now");
      cur = n; intro(next);
    },
  });
})();
