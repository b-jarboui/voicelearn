// Style: Blueprint — dark technical stage; items build up and the view glides to the newest one.
(() => {
  const css = `
  .sb{--bg:#0B1426;--panel:#13203A;--panel2:#182A4A;--ink:#EAF0FA;--muted:#8EA0BD;--line:#24365A;--acc:#6C9BFF;--warm:#FFB84D;--bad:#FF6B6B;--good:#3DD68C;
    position:absolute;inset:0;overflow:hidden;color:var(--ink);font-family:"Atkinson Hyperlegible",system-ui,sans-serif;
    background:radial-gradient(120% 80% at 80% 0%,#16264A 0%,var(--bg) 60%)}
  .sb::before{content:"";position:absolute;inset:0;opacity:.35;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:36px 36px;mask-image:linear-gradient(#000,transparent 85%)}
  .sb-cap{position:absolute;top:12px;left:14px;right:14px;z-index:3;font:700 11px system-ui;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
  .sb-cap b{color:var(--acc)}
  .sb-fade{position:absolute;left:0;right:0;top:0;height:64px;z-index:2;background:linear-gradient(var(--bg) 45%,transparent)}
  .sb-track{position:absolute;left:0;right:0;top:0;padding:56px 18px 50%;display:grid;gap:26px;transition:transform 1.1s cubic-bezier(.22,.8,.2,1)}
  .sb .m{opacity:0;transform:translateY(22px);transition:opacity .7s,transform .8s cubic-bezier(.22,.8,.2,1)}
  .sb .m.on{opacity:1;transform:none}
  .sb .k{font:700 12px system-ui;letter-spacing:.12em;text-transform:uppercase;color:var(--acc)}
  .sb h2{font:800 clamp(28px,8vw,40px)/1.05 "Bricolage Grotesque",system-ui;margin:6px 0 0}
  .sb .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .sb .card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px;display:grid;gap:4px;transition:border-color .6s,box-shadow .6s,opacity .7s,transform .8s cubic-bezier(.22,.8,.2,1)}
  .sb .card.new{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc) inset}
  .sb .card svg{width:22px;height:22px;color:var(--acc)}
  .sb .card b{font:800 18px "Bricolage Grotesque",system-ui} .sb .card span{color:var(--muted);font-size:14px}
  .sb .q{font:800 clamp(26px,7vw,36px)/1.1 "Bricolage Grotesque",system-ui}
  .sb .frac{display:grid;justify-items:center;gap:4px;font:800 26px "Bricolage Grotesque",system-ui}
  .sb .frac hr{width:70%;border:0;border-top:3px solid var(--ink);margin:2px 0}
  .sb .iss{display:flex;justify-content:space-between;gap:10px;background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--bad);border-radius:10px;padding:10px 12px}
  .sb .iss i{font-style:normal;color:var(--bad);font-weight:700;white-space:nowrap}
  .sb .cmp{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .sb .side{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;display:grid;gap:2px}
  .sb .side .arr{font:800 40px/1 "Bricolage Grotesque"} .sb .side.down .arr{color:var(--good)} .sb .side.up .arr{color:var(--bad)}
  .sb .side span{color:var(--muted);font-size:14px}
  .sb .stmt{font:800 26px/1.15 "Bricolage Grotesque",system-ui} .sb .stmt em{font-style:normal;color:var(--warm)}
  .sb-bar{position:absolute;left:0;bottom:0;height:3px;background:var(--acc);transition:width .6s;z-index:3}
  [data-tall] .sb .grid{grid-template-columns:1fr}
  @media (prefers-reduced-motion:reduce){.sb *{transition:none!important}}`;
  const st = document.createElement("style"); st.textContent = LAB.k(css); document.head.appendChild(st);

  let root, track, bar, els = [], n = 1;
  const html = (m) => {
    const ic = (k) => LAB.icon(k);
    switch (m.type) {
      case "title": return `<div><div class="k">${m.kicker}</div><h2>${m.text}</h2></div>`;
      case "item": return `<div class="card">${ic(m.icon)}<b>${m.title}</b><span>${m.text}</span></div>`;
      case "question": return `<div class="q">${m.text}</div>`;
      case "formula": return `<div><div class="k">${m.label}</div><div class="frac"><div>${m.num}</div><hr><div>${m.den}</div></div></div>`;
      case "issue": return `<div class="iss"><span>${m.text}</span><i>${m.effect}</i></div>`;
      case "compare": return `<div class="side ${m.dir}"><div class="arr">${m.dir === "down" ? "↓" : "↑"}</div><b>${m.label}</b><span>${m.note}</span></div>`;
      case "statement": return `<div class="stmt">${m.text.replace(/(didn't|not|never)/i, "<em>$1</em>")}</div>`;
      default: return `<div>${m.text || ""}</div>`;
    }
  };
  STYLES.push({
    id: "blueprint", name: "Blueprint", note: "Dark technical stage. Items build up and the view glides to the newest one. (Current style.)",
    mount(el) { root = el; root.innerHTML = `<div class="sb"><div class="sb-fade"></div><div class="sb-cap"></div><div class="sb-track"></div><div class="sb-bar"></div></div>`;
      track = root.querySelector(".sb-track"); bar = root.querySelector(".sb-bar"); },
    load(sec) {
      root.querySelector(".sb-cap").innerHTML = `<b>${sec.lesson}</b>`;
      n = sec.sentences.length;
      // group consecutive items / issues / compares into grids
      let out = "", group = null;
      sec.moments.forEach((m, i) => {
        const g = m.type === "item" ? "grid" : m.type === "compare" ? "cmp" : m.type === "issue" ? "list" : null;
        if (g !== group) { if (group) out += "</div>"; if (g) out += `<div class="${g === "list" ? "" : g}" style="${g === "list" ? "display:grid;gap:8px" : ""}">`; group = g; }
        out += `<div class="m ${m.type === "item" ? "card-wrap" : ""}" data-at="${m.at}">${html(m)}</div>`;
      });
      if (group) out += "</div>";
      track.innerHTML = out; track.style.transform = "translateY(0)";
      els = [...track.querySelectorAll(".m")];
    },
    step(i) {
      let newest = null;
      els.forEach((e) => { const on = +e.dataset.at <= i; if (on && !e.classList.contains("on")) newest = e; e.classList.toggle("on", on);
        const c = e.querySelector(".card"); if (c) c.classList.toggle("new", +e.dataset.at === i); });
      const last = els.filter((e) => e.classList.contains("on")).pop();
      const f = newest || last;
      const tb = track.getBoundingClientRect();
      // Whole section shorter than the screen: centre it. Otherwise glide to the newest item.
      const full = els[els.length - 1].getBoundingClientRect().bottom - tb.top, free = root.clientHeight - full - 24;
      if (free > 0) track.style.transform = `translateY(${free / 2}px)`;
      else if (f) { const top = f.getBoundingClientRect().top - tb.top;
        const bottom = last.getBoundingClientRect().bottom - tb.top;
        track.style.transform = `translateY(${-Math.max(0, Math.min(top + f.offsetHeight / 2 - root.clientHeight * 0.45, bottom - root.clientHeight + 40))}px)`; }
      bar.style.width = ((i + 1) / n) * 100 + "%";
    },
  });
})();
