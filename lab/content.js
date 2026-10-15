// Style lab content. Each section = narration sentences + semantic "moments".
// A moment appears when sentence `at` starts. Styles decide how each moment type looks and moves.
// Moment types: title, item (part of a group), question, formula, issue, compare, statement.
window.LAB = {
  sections: [
    {
      id: "dims",
      lesson: "Lesson 2 · Fitness for purpose",
      title: "Six core dimensions",
      sentences: [
        "Data quality is usually described through six core dimensions.",
        "Accuracy means the values reflect reality.",
        "Completeness means the required fields are present.",
        "Consistency means there are no contradictions between records or systems.",
        "Timeliness means the data is available when it is needed.",
        "Uniqueness means no entity is recorded twice.",
        "And integrity means the relationships between records are correct.",
      ],
      moments: [
        { at: 0, type: "title", kicker: "Core dimensions", text: "Six ways data can fail", count: 6 },
        { at: 1, type: "item", n: 1, of: 6, icon: "target", title: "Accuracy", text: "Values reflect reality" },
        { at: 2, type: "item", n: 2, of: 6, icon: "check", title: "Completeness", text: "Required fields present" },
        { at: 3, type: "item", n: 3, of: 6, icon: "eq", title: "Consistency", text: "No contradictions" },
        { at: 4, type: "item", n: 4, of: 6, icon: "clock", title: "Timeliness", text: "Available when needed" },
        { at: 5, type: "item", n: 5, of: 6, icon: "one", title: "Uniqueness", text: "No duplicated entities" },
        { at: 6, type: "item", n: 6, of: 6, icon: "link", title: "Integrity", text: "Correct relationships" },
      ],
    },
    {
      id: "defects",
      lesson: "Lesson 5 · Case studies",
      title: "Defect rate errors",
      sentences: [
        "Can data quality distort reality?",
        "Consider a factory that reports its defect rate as defects divided by total units.",
        "Now suppose night shift defects are not recorded, duplicate records inflate the counts, and production logs for some units are missing.",
        "The reported rate looks better than before.",
        "Management believes quality has improved, but the reality is worse.",
      ],
      moments: [
        { at: 0, type: "question", text: "Can data quality distort reality?" },
        { at: 1, type: "formula", label: "Reported defect rate", num: "Defects", den: "Total units" },
        { at: 2, type: "issue", n: 1, text: "Night shift defects not recorded", effect: "Defects ↓" },
        { at: 2, type: "issue", n: 2, text: "Duplicate records", effect: "Units ↑" },
        { at: 2, type: "issue", n: 3, text: "Missing production logs", effect: "Units ?" },
        { at: 3, type: "compare", side: "a", label: "Reported rate", dir: "down", note: "Looks better" },
        { at: 4, type: "compare", side: "b", label: "Reality", dir: "up", note: "Actually worse" },
        { at: 4, type: "statement", text: "The numbers improved. The quality didn't." },
      ],
    },
  ],
  icons: {
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    eq: '<path d="M5 9h14M5 15h14"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    one: '<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M11 9l2-1v8"/>',
    link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  },
  // Make every px size scale with the screen: the harness sets --k (1 = normal, larger in full screen).
  k(css) { return css.replace(/(-?\d*\.?\d+)px/g, "calc($1px*var(--k,1))"); },
  icon(k, cls = "") {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${this.icons[k] || ""}</svg>`;
  },
};
// Each style registers here: { id, name, note, mount(el), load(section), step(i) }
window.STYLES = [];
