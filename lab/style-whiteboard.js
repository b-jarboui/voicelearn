// Style: Whiteboard — a teacher sketching live: marker strokes draw themselves, the camera follows the pen.
(() => {
  const css = `
  .sw{--paper:#FBFBF8;--ink:#1D2A44;--blue:#2457D6;--red:#D8452F;--green:#1F8A57;--hl:#FFE36B;
    position:absolute;inset:0;overflow:hidden;background:var(--paper);color:var(--ink);font-family:Kalam,"Comic Sans MS",cursive}
  .sw::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 10%,rgba(0,0,0,.035),transparent 40%),radial-gradient(circle at 90% 80%,rgba(0,0,0,.04),transparent 45%)}
  .sw-cap{position:absolute;top:12px;left:16px;z-index:3;font:700 13px Kalam,cursive;color:#8a93a6}
  .sw-board{position:absolute;left:0;right:0;top:0;padding:52px 20px 60%;display:grid;gap:22px;transition:transform 1.2s cubic-bezier(.4,0,.2,1)}
  .sw .m{position:relative;opacity:0;transition:opacity .25s}
  .sw .m.on{opacity:1}
  .sw svg.d{position:absolute;inset:-6px;width:calc(100% + 12px);height:calc(100% + 12px);overflow:visible;pointer-events:none}
  .sw svg.d path{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1;stroke-dashoffset:1;transition:stroke-dashoffset 1.1s ease var(--d,0s)}
  .sw .m.on svg.d path{stroke-dashoffset:0}
  .sw .t{opacity:0;transform:translateY(4px);transition:all .5s ease var(--td,.35s)} .sw .m.on .t{opacity:1;transform:none}
  .sw h2{font:700 34px/1.05 Kalam,cursive;margin:0;color:var(--blue)}
  .sw .k{font:700 15px Kalam;color:var(--red)}
  .sw .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 14px}
  .sw .box{padding:12px 12px 10px;display:grid;gap:2px;min-height:96px}
  .sw .box:nth-child(odd){transform:rotate(-1.2deg)} .sw .box:nth-child(even){transform:rotate(1deg)}
  .sw .box b{font:700 22px/1.1 Kalam;color:var(--blue)} .sw .box span{font-size:16px;line-height:1.2}
  .sw .box .n{font:700 14px Kalam;color:var(--red)}
  .sw .q{font:700 32px/1.1 Kalam;padding-bottom:10px}
  .sw .frac{display:grid;justify-items:center;font:700 30px Kalam;gap:6px;padding:4px}
  .sw .iss{font-size:21px;line-height:1.2;padding:4px 4px 4px 34px;display:flex;justify-content:space-between;gap:8px}
  .sw .iss i{font-style:normal;color:var(--red);white-space:nowrap}
  .sw .cmp{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .sw .side{padding:12px;display:grid;justify-items:center;text-align:center;font-size:18px}
  .sw .side b{font:700 22px Kalam}
  .sw .stmt{font:700 27px/1.2 Kalam}
  .sw .hl{background:linear-gradient(transparent 55%,var(--hl) 55%,var(--hl) 90%,transparent 90%) no-repeat;background-size:0% 100%;transition:background-size .9s ease .5s}
  .sw .m.on .hl{background-size:100% 100%}
  .sw-pen{position:absolute;width:12px;height:12px;border-radius:50%;background:var(--blue);box-shadow:0 0 0 4px rgba(36,87,214,.18);z-index:4;
    transition:left 1s cubic-bezier(.4,0,.2,1),top 1s cubic-bezier(.4,0,.2,1),opacity .4s;opacity:0}
  @media (prefers-reduced-motion:reduce){.sw *{transition:none!important}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // Hand-drawn shapes on a 100x100 box (preserveAspectRatio=none), jittered so no two look alike.
  let seed = 7; const r = (a) => { seed = (seed * 9301 + 49297) % 233280; return (seed / 233280 - 0.5) * a; };
  // Rough.js (if loaded) gives genuinely sketchy double strokes; otherwise a simple jittered fallback.
  const RG = window.rough ? window.rough.generator() : null;
  const rp = (d) => RG.toPaths(d).map((p) => p.d).join(" ");
  const ro = () => ({ roughness: 1.5, bowing: 1.8, seed: 1 + Math.floor(Math.abs(r(1000))) });
  const rect = () => RG ? rp(RG.rectangle(3, 3, 94, 94, ro())) : (() => { const p = (x, y) => `${(x + r(2.5)).toFixed(1)} ${(y + r(3)).toFixed(1)}`;
    return `M${p(2, 4)} L${p(98, 2)} L${p(97, 97)} L${p(3, 98)} Z M${p(4, 2)} L${p(96, 5)}`; })();
  const under = () => RG ? rp(RG.curve([[0, 95], [35, 91 + r(3)], [70, 99 + r(3)], [100, 93]], ro())) : `M0 ${96 + r(2)} C30 ${92 + r(4)} 70 ${100 + r(4)} 100 ${94 + r(2)}`;
  const circ = () => RG ? rp(RG.ellipse(50, 50, 94, 90, ro())) : `M50 2 C85 ${r(4)} 100 40 96 60 C90 92 30 100 10 80 C-4 62 8 10 52 6`;
  // Hatched marker fill (Rough.js hachure), drawn faintly behind a box.
  const hatch = (color) => RG ? `<svg class="d" viewBox="0 0 100 100" preserveAspectRatio="none" style="opacity:.28">${RG.toPaths(RG.rectangle(8, 8, 84, 84, { ...ro(), stroke: "none", fill: color, fillStyle: "hachure", hachureGap: 7, fillWeight: 1.6 }))
    .filter((p) => p.d).map((p) => `<path pathLength="1" d="${p.d}" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" style="--d:.5s"/>`).join("")}</svg>` : "";
  const svg = (paths, color, w = 2.6, extra = "") => `<svg class="d" viewBox="0 0 100 100" preserveAspectRatio="none" ${extra}>${paths.map((d, k) => `<path pathLength="1" d="${d}" stroke="${color}" stroke-width="${w}" vector-effect="non-scaling-stroke" style="--d:${(k * 0.25).toFixed(2)}s"/>`).join("")}</svg>`;
  const C = { blue: "#2457D6", red: "#D8452F", green: "#1F8A57", ink: "#1D2A44" };

  function html(m) {
    switch (m.type) {
      case "title": return `<div class="k t" style="--td:.1s">${m.kicker}</div><h2 class="t" style="--td:.2s"><span class="hl">${m.text}</span></h2>`;
      case "item": return `<div class="box">${svg([rect()], C.ink)}<span class="n t">${m.n}.</span><b class="t">${m.title}</b><span class="t" style="--td:.6s">${m.text}</span></div>`;
      case "question": return `<div class="q">${svg([under()], C.red, 3)}<span class="t" style="--td:.05s">${m.text}</span></div>`;
      case "formula": return `<div class="k t" style="--td:0s">${m.label}</div><div class="frac"><span class="t">${m.num}</span>
        <svg viewBox="0 0 100 6" preserveAspectRatio="none" style="width:70%;height:8px;overflow:visible" class="d2"><path pathLength="1" d="M0 3 C30 ${1 + r(2)} 70 ${5 + r(2)} 100 3" stroke="${C.ink}" stroke-width="3" fill="none" style="stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .8s .4s"/></svg>
        <span class="t" style="--td:.9s">${m.den}</span></div>`;
      case "issue": return `<div class="iss">${svg([circ()], C.red, 2.4, 'style="width:28px;height:28px;inset:auto;left:0;top:2px"')}<span class="t">${m.text}</span><i class="t" style="--td:.8s">${m.effect}</i></div>`;
      case "compare": return `<div class="side">${hatch(m.dir === "down" ? C.green : C.red)}${svg([rect()], m.dir === "down" ? C.green : C.red)}
        <svg viewBox="0 0 40 60" style="width:34px;height:48px;overflow:visible" class="arrowsvg"><path pathLength="1" d="${m.dir === "down" ? "M20 4 L20 54 M8 42 L20 56 L32 42" : "M20 56 L20 6 M8 18 L20 4 L32 18"}" stroke="${m.dir === "down" ? C.green : C.red}" stroke-width="4" fill="none" stroke-linecap="round" style="stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .9s .3s"/></svg>
        <b class="t">${m.label}</b><span class="t" style="--td:.7s">${m.note}</span></div>`;
      case "statement": return `<div class="stmt t"><span class="hl">${m.text}</span></div>`;
      default: return `<div class="t">${m.text || ""}</div>`;
    }
  }
  let root, board, pen, els = [];
  STYLES.push({
    id: "whiteboard", name: "Whiteboard", note: "A teacher sketching live. Marker strokes draw themselves and the view follows the pen.",
    mount(el) { root = el; root.innerHTML = `<div class="sw"><div class="sw-cap"></div><div class="sw-board"></div><div class="sw-pen"></div></div>`;
      board = root.querySelector(".sw-board"); pen = root.querySelector(".sw-pen"); },
    load(sec) {
      seed = 7; root.querySelector(".sw-cap").textContent = sec.lesson;
      let out = "", group = null;
      sec.moments.forEach((m) => {
        const g = m.type === "item" ? "grid" : m.type === "compare" ? "cmp" : null;
        if (g !== group) { if (group) out += "</div>"; if (g) out += `<div class="${g}">`; group = g; }
        out += `<div class="m" data-at="${m.at}">${html(m)}</div>`;
      });
      if (group) out += "</div>";
      board.innerHTML = out; board.style.transform = "translateY(0)"; pen.style.opacity = 0;
      els = [...board.querySelectorAll(".m")];
      // non-wrapped drawn paths (formula line, arrows) follow the same on/off switch
      const ex = document.createElement("style"); ex.textContent = ".sw .m.on .d2 path,.sw .m.on .arrowsvg path{stroke-dashoffset:0!important}"; board.appendChild(ex);
    },
    step(i) {
      let newest = null;
      els.forEach((e) => { const on = +e.dataset.at <= i; if (on && !e.classList.contains("on")) newest = e; e.classList.toggle("on", on); });
      const last = els.filter((e) => e.classList.contains("on")).pop();
      const f = newest || last; if (!f) return;
      const tb = board.getBoundingClientRect(), fr = f.getBoundingClientRect();
      const top = fr.top - tb.top, bottom = last.getBoundingClientRect().bottom - tb.top;
      const y = Math.max(0, Math.min(top + f.offsetHeight / 2 - root.clientHeight * 0.45, bottom - root.clientHeight + 40));
      board.style.transform = `translateY(${-y}px)`;
      pen.style.opacity = 1; pen.style.left = Math.min(root.clientWidth - 24, fr.right - tb.left - 6) + "px"; pen.style.top = top - y + f.offsetHeight - 6 + "px";
      clearTimeout(pen._t); pen._t = setTimeout(() => (pen.style.opacity = 0), 1800);
    },
  });
})();
