/* Signal Studio — a narrated, growing field guide. No dependencies. */
(() => {
  'use strict';
  const css = `
  .cx-signal{--cx-bg:#152d2a;--cx-paper:#f3f0e5;--cx-lime:#d9f879;--cx-muted:#b3c7be;position:relative;isolation:isolate;container-type:size;display:flex;flex-direction:column;height:100%;overflow:hidden;background:var(--cx-bg);color:var(--cx-paper);font:16px/1.4 'Atkinson Hyperlegible',sans-serif}
  .cx-signal *{box-sizing:border-box}
  .cx-signal .cx-top{flex:none;padding:22px 24px 16px;border-bottom:1px solid #ffffff24;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .cx-signal .cx-brand{font:800 13px 'Bricolage Grotesque',sans-serif;letter-spacing:.13em;text-transform:uppercase;display:flex;align-items:center;gap:9px}
  .cx-signal .cx-mark{display:flex;gap:3px;align-items:center;height:19px}
  .cx-signal .cx-mark i{display:block;width:3px;height:9px;background:var(--cx-lime);transform:rotate(20deg)}
  .cx-signal .cx-mark i:nth-child(2){height:18px}.cx-signal .cx-mark i:nth-child(3){height:13px}
  .cx-signal .cx-counter{font:12px ui-monospace,monospace;color:var(--cx-muted);white-space:nowrap}
  .cx-signal .cx-progress{height:3px;flex:none;background:#ffffff12}
  .cx-signal .cx-progress span{display:block;height:100%;width:0;background:var(--cx-lime);transition:width .45s ease}
  .cx-signal .cx-scroll{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#769789 transparent;padding:24px 22px 32px;scroll-padding:20px}
  .cx-signal .cx-lesson{color:var(--cx-muted);font-size:12px;letter-spacing:.035em;margin-bottom:18px;overflow-wrap:anywhere}
  .cx-signal .cx-wait{min-height:260px;display:flex;flex-direction:column;justify-content:center;gap:22px}
  .cx-signal .cx-orbit{width:132px;height:132px;border:1px solid #b3c7be60;border-radius:50%;position:relative;margin-bottom:6px}
  .cx-signal .cx-orbit:before{content:'';position:absolute;inset:19px;border:1px solid #b3c7be60;border-radius:50%}
  .cx-signal .cx-orbit:after{content:'';position:absolute;inset:46px;background:var(--cx-lime);border-radius:50%;box-shadow:47px -37px 0 -12px var(--cx-paper)}
  .cx-signal .cx-wait strong{font:600 34px/1.05 'Bricolage Grotesque',sans-serif;max-width:220px;letter-spacing:-.04em}
  .cx-signal .cx-wait small{color:var(--cx-muted);font-size:14px}
  .cx-signal [hidden]{display:none!important}
  .cx-signal .cx-entry{position:relative;margin-bottom:10px;overflow-wrap:anywhere}
  .cx-signal .cx-enter{animation:cx-arrive .52s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--cx-delay,0ms)}
  .cx-signal .cx-eyebrow{font:700 11px/1.3 'Atkinson Hyperlegible',sans-serif;text-transform:uppercase;letter-spacing:.13em;display:block;margin-bottom:12px}
  .cx-signal .cx-heading{font:800 clamp(29px,8cqw,40px)/1.04 'Bricolage Grotesque',sans-serif;letter-spacing:-.045em;margin:0;text-wrap:balance}
  .cx-signal .cx-title{padding:2px 0 22px;margin-bottom:15px;border-bottom:1px solid #ffffff30}
  .cx-signal .cx-title .cx-eyebrow{color:var(--cx-lime)}
  .cx-signal .cx-count{margin-top:18px;display:flex;gap:5px;max-width:100%}
  .cx-signal .cx-count i{width:22px;height:5px;background:#ffffff35;border-radius:4px}
  .cx-signal .cx-item{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:12px;padding:13px 12px;border:1px solid #ffffff25;border-radius:3px;transition:background .3s,color .3s,border-color .3s}
  .cx-signal .cx-item.cx-active{background:var(--cx-lime);border-color:var(--cx-lime);color:var(--cx-bg)}
  .cx-signal .cx-icon{width:40px;height:40px;display:grid;place-items:center;border:1px solid currentColor;border-radius:50%}
  .cx-signal .cx-icon svg{width:24px;height:24px}
  .cx-signal .cx-item h3{font:800 20px/1.1 'Bricolage Grotesque',sans-serif;margin:0 0 4px;letter-spacing:-.025em}
  .cx-signal .cx-item p{font-size:14px;line-height:1.25;margin:0}
  .cx-signal .cx-index{font:11px ui-monospace,monospace;align-self:start;padding-top:3px;opacity:.75}
  .cx-signal .cx-question{background:var(--cx-lime);color:var(--cx-bg);padding:22px;border-radius:3px;margin-bottom:18px}
  .cx-signal .cx-question .cx-q{display:block;font:600 64px/.9 'Fraunces',serif;margin-bottom:14px}
  .cx-signal .cx-formula{background:var(--cx-paper);color:var(--cx-bg);padding:20px;border-radius:3px;margin-bottom:18px}
  .cx-signal .cx-fraction{display:grid;text-align:center;font:600 26px/1.2 'Fraunces',serif;gap:11px;padding:6px 0}
  .cx-signal .cx-fraction span+span{border-top:2px solid var(--cx-bg);padding-top:11px}
  .cx-signal .cx-issue{display:grid;grid-template-columns:25px 1fr;gap:9px;border-left:2px solid #ffb89e;padding:8px 0 8px 12px}
  .cx-signal .cx-issue .cx-alert{color:#ffb89e;font:600 22px 'Fraunces',serif}
  .cx-signal .cx-issue p{margin:0;font-size:16px;line-height:1.25}
  .cx-signal .cx-effect{display:inline-block;color:#ffb89e;font:700 12px/1.4 'Atkinson Hyperlegible',sans-serif;margin-top:5px;letter-spacing:.02em}
  .cx-signal .cx-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:20px 0 14px}
  .cx-signal .cx-pair:empty{display:none}
  .cx-signal .cx-compare{background:#24423b;border:1px solid #ffffff30;padding:14px 12px;margin:0;min-width:0;border-radius:3px}
  .cx-signal .cx-compare[data-side="b"]{background:#ffb89e;color:var(--cx-bg);border-color:#ffb89e}
  .cx-signal .cx-compare .cx-arrow{display:block;font:400 54px/.95 'Atkinson Hyperlegible',sans-serif;margin:8px 0 10px;color:var(--cx-lime)}
  .cx-signal .cx-compare[data-side="b"] .cx-arrow{color:var(--cx-bg)}
  .cx-signal .cx-compare .cx-eyebrow{letter-spacing:.04em;margin:0}
  .cx-signal .cx-compare p{margin:0;font:800 20px/1.1 'Bricolage Grotesque',sans-serif}
  .cx-signal .cx-statement{border-top:1px solid var(--cx-lime);padding:20px 0 6px;margin-top:18px}
  .cx-signal .cx-statement .cx-eyebrow{color:var(--cx-lime)}
  .cx-signal .cx-statement p{font:600 28px/1.15 'Fraunces',serif;letter-spacing:-.025em;margin:0;text-wrap:pretty}
  .cx-signal .cx-foot{flex:none;border-top:1px solid #ffffff24;padding:12px 24px;display:flex;align-items:center;gap:9px;font:10px/1.3 ui-monospace,monospace;letter-spacing:.12em;color:var(--cx-muted);text-transform:uppercase}
  .cx-signal .cx-dot{width:6px;height:6px;border-radius:50%;background:var(--cx-lime)}
  @keyframes cx-arrive{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @container (max-width:340px){.cx-signal .cx-scroll{padding:18px 15px 24px}.cx-signal .cx-item{gap:8px;padding:12px 9px;grid-template-columns:36px 1fr auto}.cx-signal .cx-icon{width:34px;height:34px}.cx-signal .cx-item h3{font-size:18px}.cx-signal .cx-top{padding:18px 16px 14px}}
  @media(prefers-reduced-motion:reduce){.cx-signal .cx-enter{animation:none}.cx-signal .cx-progress span,.cx-signal .cx-item{transition:none}}
  `;
  const sheet = document.createElement('style');
  sheet.textContent = css;
  document.head.appendChild(sheet);
  const node = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = String(text);
    return el;
  };
  const icons = {
    target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    eq:'<path d="M5 9h14M5 15h14"/>',
    clock:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    one:'<rect x="5" y="4" width="14" height="16" rx="3"/><path d="m10 9 2-1v8"/>',
    link:'<path d="m10 14 4-4m-6 5-1 1a4 4 0 0 1-5-6l4-4a4 4 0 0 1 6 0m0 3 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>'
  };
  let root, scroll, content, wait, lesson, counter, progress, status, entries = [], section, last = null;
  function makeMoment(m) {
    const type = m.type || 'statement';
    const el = node('article', `cx-entry cx-${type}`);
    const eyebrow = text => el.append(node('span', 'cx-eyebrow', text));
    switch (type) {
      case 'title': {
        eyebrow(m.kicker || 'The big idea');
        el.append(node('h2', 'cx-heading', m.text));
        if (Number.isFinite(m.count) && m.count > 0) {
          const ticks = node('div', 'cx-count'); ticks.setAttribute('aria-hidden','true');
          for (let n=0; n<Math.min(m.count,24); n++) ticks.append(node('i'));
          el.append(ticks);
        }
        break;
      }
      case 'item': {
        const icon = node('span','cx-icon'); icon.setAttribute('aria-hidden','true');
        // Only fixed local paths enter SVG markup; all course text uses textContent.
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[m.icon] || '<path d="m6 12 4 4 8-8"/>'}</svg>`;
        const copy = node('div');
        copy.append(node('h3','',m.title),node('p','',m.text));
        el.append(icon,copy,node('span','cx-index',m.n == null ? '' : `${String(m.n).padStart(2,'0')}${m.of ? ' / '+m.of : ''}`));
        break;
      }
      case 'question':
        el.append(node('span','cx-q','?')); eyebrow('Consider this');
        el.append(node('h2','cx-heading',m.text)); break;
      case 'formula': {
        eyebrow(m.label || 'The calculation');
        const fraction = node('div','cx-fraction');
        fraction.setAttribute('aria-label',`${m.num || ''} divided by ${m.den || ''}`);
        fraction.append(node('span','',m.num),node('span','',m.den));
        el.append(fraction); break;
      }
      case 'issue': {
        el.append(node('span','cx-alert','!'));
        const copy = node('div'); copy.append(node('p','',m.text));
        if (m.effect) copy.append(node('span','cx-effect',m.effect));
        el.append(copy); break;
      }
      case 'compare':
        el.dataset.side = m.side || 'a'; eyebrow(m.label || 'Comparison');
        el.append(node('span','cx-arrow',m.dir === 'up' ? '↗' : m.dir === 'down' ? '↘' : '↔'),node('p','',m.note));
        break;
      default:
        el.className = 'cx-entry cx-statement';
        eyebrow('Take this with you'); el.append(node('p','',m.text || m.title));
    }
    return el;
  }
  STYLES.push({
    id:'codex', name:'Signal Studio',
    note:'An animated field guide. Bold signals, a growing trail, one idea at a time.',
    mount(rootEl) {
      root = rootEl; root.classList.add('cx-signal'); root.replaceChildren();
      const top = node('div','cx-top'); const brand = node('div','cx-brand');
      const mark = node('span','cx-mark'); mark.setAttribute('aria-hidden','true');
      mark.append(node('i'),node('i'),node('i')); brand.append(mark,node('span','','Signal studio'));
      counter = node('span','cx-counter'); top.append(brand,counter);
      const track = node('div','cx-progress'); track.setAttribute('aria-hidden','true');
      progress = node('span'); track.append(progress);
      scroll = node('div','cx-scroll'); scroll.tabIndex = 0; scroll.setAttribute('role','region'); scroll.setAttribute('aria-label','Lesson visual notes');
      lesson = node('div','cx-lesson');
      wait = node('div','cx-wait'); wait.append(node('div','cx-orbit'),node('strong','','Make room for an idea.'),node('small','','Press Play. Follow the signal.'));
      content = node('div','cx-content');
      scroll.append(lesson,wait,content);
      const foot = node('div','cx-foot'); status = node('span','','Ready when you are'); foot.append(node('span','cx-dot'),status);
      root.append(top,track,scroll,foot);
    },
    load(data) {
      section = data; last = null; entries = []; content.replaceChildren();
      lesson.textContent = data.lesson || data.title || '';
      let pair = null;
      // Keep source order for ties, even when multiple moments share a sentence.
      const sorted = (data.moments || []).map((m,n)=>({m,n})).sort((a,b)=>(a.m.at-b.m.at)||(a.n-b.n));
      sorted.forEach(({m}) => {
        const el = makeMoment(m); el.hidden = true;
        if (m.type === 'compare') {
          if (!pair) { pair = node('div','cx-pair'); content.append(pair); }
          pair.append(el);
        } else { pair = null; content.append(el); }
        entries.push({m,el});
      });
      scroll.scrollTop = 0; this.step(-1);
    },
    step(i) {
      if (!section || !root) return;
      const current = Number.isFinite(i) ? Math.trunc(i) : -1;
      if (current === last) return;
      const active = entries.filter(({m})=>m.at<=current && current>=0);
      const newest = active.length ? active[active.length-1].m.at : -1;
      let delay = 0;
      entries.forEach(({m,el}) => {
        const visible = current >= 0 && m.at <= current;
        const entering = visible && el.hidden;
        el.hidden = !visible;
        el.classList.toggle('cx-active',visible && m.at === newest);
        el.classList.remove('cx-enter');
        if (entering) {
          el.style.setProperty('--cx-delay',`${Math.min(delay++,3)*75}ms`);
          el.classList.add('cx-enter');
        }
      });
      content.querySelectorAll('.cx-pair').forEach(el=>{ el.hidden = !Array.from(el.children).some(child=>!child.hidden); });
      wait.hidden = active.length > 0;
      const total = (section.sentences || []).length;
      const spoken = Math.max(0,Math.min(current+1,total));
      counter.textContent = `${String(spoken).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
      progress.style.width = `${total ? spoken/total*100 : 0}%`;
      status.textContent = spoken === 0 ? 'Ready when you are' : spoken === total ? 'A new perspective, collected' : 'Listen · connect · remember';
      // Scroll only this panel; never move the surrounding player or steal focus.
      if (active.length) {
        const target = active[active.length-1].el;
        const bottom = target.getBoundingClientRect().bottom - scroll.getBoundingClientRect().top + scroll.scrollTop;
        if (bottom > scroll.scrollTop + scroll.clientHeight - 24 || (last != null && current < last)) {
          scroll.scrollTop = Math.max(0,bottom-scroll.clientHeight+24);
        }
      } else scroll.scrollTop = 0;
      last = current;
    }
  });
})();
