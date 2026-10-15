// Adaptive layer: learning outcomes, question bank (core + practice), and review lessons per outcome.
// Option order is shuffled at runtime, so `answer` is always the index in the list as written here.
window.ADAPTIVE = {
  target: 0.8,
  maxRemediation: 2,
  outcomes: {
    LO1: { name: "Define", full: "Define data quality as fitness for purpose" },
    LO2: { name: "Diagnose", full: "Identify data quality dimensions and typical problems" },
    LO3: { name: "Prepare", full: "Describe the preparatory analytics steps before modelling" },
    LO4: { name: "Integrate", full: "Connect data quality to robust quality" },
  },

  // Lesson checks (asked after each lesson).
  core: {
    l1: [
      { id: "c1a", lo: "LO1", q: "Which statement best defines data quality?", o: ["The degree to which data is fit for its intended purpose", "Data that contains no errors at all", "Having a very large volume of data", "Data stored in a secure database"], why: "Data quality is fitness for purpose: good enough for the decision it supports." },
      { id: "c1b", lo: "LO4", q: "Robust quality integrates which three things?", o: ["Process, data and analytics quality", "Speed, cost and volume", "Hardware, software and network", "Accuracy, completeness and timeliness"], why: "Robust quality measures process, data and analytics quality together." },
      { id: "c1c", lo: "LO4", q: "When data quality is poor, what goes wrong first?", o: ["The quality measurement is incorrect", "The improvement decisions", "The model training time", "The IT budget"], why: "The chain starts with incorrect measurement, then misleading analytics, then wrong decisions." },
      { id: "c1d", lo: "LO3", q: "What is preparatory analytics?", o: ["Work done before modelling to assess data health", "Tuning a model's parameters", "Reporting KPIs to management", "Deleting old records"], why: "Preparatory analytics checks the health of the data before any modelling." },
    ],
    l2: [
      { id: "c2a", lo: "LO2", q: "A daily dashboard only receives yesterday's figures a week later. Which dimension is failing?", o: ["Timeliness", "Accuracy", "Uniqueness", "Integrity"], why: "The figures may be correct, but they arrive too late for a daily purpose." },
      { id: "c2b", lo: "LO1", q: "What does a predictive model need most from its data?", o: ["Accurate labels and stable data", "Colourful charts", "The largest dataset possible", "Manual data entry"], why: "Without accurate labels and stability, the model learns the wrong patterns." },
      { id: "c2c", lo: "LO2", q: "The same customer is recorded twice. Which dimension is violated?", o: ["Uniqueness", "Accuracy", "Timeliness", "Validity"], why: "Uniqueness means no entity is recorded more than once." },
      { id: "c2d", lo: "LO1", q: "True or false: clean data is always high-quality data, whatever the purpose.", o: ["False", "True"], why: "Quality depends on the purpose. Clean data can still be late, incomplete, or wrong for the goal." },
    ],
    l3: [
      { id: "c3a", lo: "LO2", q: "Some patient records show a waiting time of minus 15 minutes. What does this indicate?", o: ["A data quality problem", "Normal variation in the process", "Patients were served before they arrived", "An excellent service level"], why: "A negative waiting time is impossible: a validity failure. Check timestamps, time zones and event definitions." },
      { id: "c3b", lo: "LO2", q: "A sensor reads 95 degrees when the true temperature is 75. Which dimension fails?", o: ["Accuracy", "Completeness", "Consistency", "Timeliness"], why: "Accuracy means values reflect reality." },
      { id: "c3c", lo: "LO2", q: "An order is linked to a customer ID that does not exist. Which dimension fails?", o: ["Integrity", "Uniqueness", "Accuracy", "Timeliness"], why: "Integrity means relationships between records are correct." },
      { id: "c3d", lo: "LO2", q: "The same product ID has different names in the ERP and the CRM. Which dimension fails?", o: ["Consistency", "Validity", "Completeness", "Uniqueness"], why: "Consistency means no contradictions between systems." },
    ],
    l4: [
      { id: "c4a", lo: "LO3", q: "Which step comes right after Understanding?", o: ["Profiling", "Cleaning", "Validation", "Integration"], why: "The order is understanding, profiling, cleaning, integration, validation." },
      { id: "c4b", lo: "LO3", q: "Imputing missing values belongs to which step?", o: ["Cleaning", "Profiling", "Validation", "Understanding"], why: "Cleaning imputes missing data and standardises formats." },
      { id: "c4c", lo: "LO3", q: "What are the main risks during integration?", o: ["Wrong joins, mismatched keys and time misalignment", "Too few charts", "Slow internet", "Model overfitting"], why: "Merging sources like ERP, IoT and logs risks wrong joins, mismatched keys and time errors." },
      { id: "c4d", lo: "LO3", q: "Checking results with a domain expert and a data dictionary is called…", o: ["Validation", "Profiling", "Cleaning", "Integration"], why: "Validation is the final check with experts and the data dictionary." },
    ],
    l5: [
      { id: "c5a", lo: "LO4", q: "Night shift defects are not recorded. The reported defect rate will…", o: ["Look better than reality", "Look worse than reality", "Be exactly right", "Be impossible to compute"], why: "Missing defects shrink the numerator, so the rate looks better than it really is." },
      { id: "c5b", lo: "LO2", q: "Duplicate delivery identifiers are a problem of…", o: ["Uniqueness", "Timeliness", "Accuracy", "Integrity"], why: "Duplicates break uniqueness." },
      { id: "c5c", lo: "LO4", q: "Why is data quality the foundation of robust quality?", o: ["Process and analytics quality can only be as good as the data beneath them", "It is the cheapest part", "Models fix bad data automatically", "It only matters for audits"], why: "Everything above the data inherits its problems." },
      { id: "c5d", lo: "LO4", q: "A model trained on noisy logistics data will most likely…", o: ["Learn noise and send wrong alerts", "Become more accurate", "Ignore the noise", "Need no validation"], why: "Bad data teaches the model noise instead of patterns." },
    ],
  },

  // Extra practice used for remediation, per outcome.
  practice: {
    LO1: [
      { id: "p1a", lo: "LO1", q: "A quality audit most needs data that is…", o: ["Complete and traceable", "Animated in dashboards", "Streamed in real time", "Stored in the newest database"], why: "Audits must trace every figure back to its source." },
      { id: "p1b", lo: "LO1", q: "Fitness for purpose means the data is…", o: ["Good enough for the specific decision it supports", "Perfect in every field", "Kept for ten years", "Collected automatically"], why: "Quality is judged against the purpose, not against perfection." },
      { id: "p1c", lo: "LO1", q: "True or false: the same dataset can be high quality for one use and low quality for another.", o: ["True", "False"], why: "Yes. A dataset fine for a yearly report may be too slow for a live dashboard." },
      { id: "p1d", lo: "LO1", q: "A dashboard people act on every day needs above all…", o: ["Timeliness and consistency", "Long historical archives", "Complex models", "Manual entry"], why: "Daily decisions need fresh, consistent numbers." },
    ],
    LO2: [
      { id: "p2a", lo: "LO2", q: "The required delivery date is empty in 30% of rows. Which dimension fails?", o: ["Completeness", "Accuracy", "Uniqueness", "Integrity"], why: "Required fields must be present." },
      { id: "p2b", lo: "LO2", q: "A record shows a person's age as 212 years. Which dimension fails?", o: ["Validity", "Timeliness", "Uniqueness", "Consistency"], why: "The value breaks the allowed range for the field." },
      { id: "p2c", lo: "LO2", q: "Sales data arrives after the weekly decision meeting. Which dimension fails?", o: ["Timeliness", "Accuracy", "Completeness", "Integrity"], why: "Data must be available when it is needed." },
      { id: "p2d", lo: "LO2", q: "A payment points to an account ID that was deleted. Which dimension fails?", o: ["Integrity", "Validity", "Accuracy", "Uniqueness"], why: "The relationship between records is broken." },
    ],
    LO3: [
      { id: "p3a", lo: "LO3", q: "What is the correct order of the preparatory steps?", o: ["Understand, profile, clean, integrate, validate", "Clean, understand, validate, profile, integrate", "Profile, validate, clean, understand, integrate", "Integrate, clean, profile, validate, understand"], why: "Know it, measure it, fix it, join it, check it." },
      { id: "p3b", lo: "LO3", q: "Measuring the share of missing values in each column is…", o: ["Profiling", "Cleaning", "Validation", "Understanding"], why: "Profiling quantifies the problems before fixing them." },
      { id: "p3c", lo: "LO3", q: "Learning a field's meaning, units and source is…", o: ["Understanding", "Profiling", "Integration", "Validation"], why: "Understanding comes first: what does each field mean?" },
      { id: "p3d", lo: "LO3", q: "Detecting drift in a variable over time happens during…", o: ["Profiling", "Cleaning", "Integration", "Understanding"], why: "Profiling looks at distributions and drift over time." },
    ],
    LO4: [
      { id: "p4a", lo: "LO4", q: "Robust quality measures…", o: ["Process, data and analytics quality together", "Only analytics accuracy", "Only process speed", "Only data volume"], why: "It is the integrated view of all three." },
      { id: "p4b", lo: "LO4", q: "When data quality is poor, which chain follows?", o: ["Wrong measurement, then misleading analytics, then wrong decisions", "Wrong decisions, then wrong measurement, then good analytics", "Good analytics, then good decisions", "Nothing changes"], why: "Errors flow upward from measurement to decisions." },
      { id: "p4c", lo: "LO4", q: "Management believes quality improved, but reality is worse. The likely root cause is…", o: ["Data quality problems in the counts", "A better process", "New KPIs", "Staff training"], why: "Missing or duplicated records distort the reported rate." },
      { id: "p4d", lo: "LO4", q: "True or false: good analytics can fully compensate for poor data.", o: ["False", "True"], why: "Analytics cannot be better than the data underneath it." },
    ],
  },

  // Short review lessons, narrated with their own scene, one per outcome.
  review: {
    LO1: {
      title: "Fitness for purpose, again",
      script: "Let's look at this from another angle. Data quality is not about perfection. Ask one question: is this data good enough for this decision? A daily dashboard needs fresh and consistent numbers. A predictive model needs correct labels and stable data. An audit needs complete records that can be traced. Same data, different purposes, different verdicts.",
      beats: [
        { at: 0, html: '<div class="st-kicker">Review · Define</div><h2 class="st-h">Fitness for purpose</h2>' },
        { at: 2, html: '<div class="st-quote">Is this data <em>good enough</em> for <em>this</em> decision?</div>' },
        { at: 3, html: '<div class="st-cards"><div class="st-it st-card" data-at="3"><b>Dashboard</b><span>Fresh + consistent</span></div><div class="st-it st-card" data-at="4"><b>Model</b><span>Correct labels + stable</span></div><div class="st-it st-card" data-at="5"><b>Audit</b><span>Complete + traceable</span></div></div>' },
        { at: 6, html: '<div class="st-note" style="font-size:18px">Same data · different purposes · different verdicts</div>' },
      ],
    },
    LO2: {
      title: "Diagnose with seven questions",
      script: "Here is a simple way to diagnose any dataset. Ask seven questions. Is it true? That is accuracy. Is anything missing? That is completeness. Do the systems agree? That is consistency. Did it arrive in time? That is timeliness. Is anything counted twice? That is uniqueness. Do the links point to real records? That is integrity. And does every value obey its field's rules? That is validity.",
      beats: [
        { at: 0, html: '<div class="st-kicker">Review · Diagnose</div><h2 class="st-h">Seven questions</h2>' },
        { at: 2, html: '<div class="st-cards">' + [["Is it true?", "Accuracy", 2], ["Anything missing?", "Completeness", 4], ["Do systems agree?", "Consistency", 6], ["Arrived in time?", "Timeliness", 8], ["Counted twice?", "Uniqueness", 10], ["Links real?", "Integrity", 12], ["Obeys the rules?", "Validity", 14]].map(([q, d, a]) => `<div class="st-it st-card" data-at="${a}"><span>${q}</span><b>${d}</b></div>`).join("") + "</div>" },
      ],
    },
    LO3: {
      title: "Know it, measure it, fix it, join it, check it",
      script: "Remember the preparatory workflow as five verbs. First, know it: understand what each field means, its units and its source. Second, measure it: profile missing values, outliers and drift. Third, fix it: clean, impute and standardise. Fourth, join it: integrate sources with the right keys and time alignment. Fifth, check it: validate with an expert and the data dictionary.",
      beats: [
        { at: 0, html: '<div class="st-kicker">Review · Prepare</div><h2 class="st-h">Five verbs</h2>' },
        { at: 1, fx: "pipe", html: '<div class="st-pipe"><div class="prog"></div>' + [["Know it", "Understanding", 1], ["Measure it", "Profiling", 2], ["Fix it", "Cleaning", 3], ["Join it", "Integration", 4], ["Check it", "Validation", 5]].map(([v, s, a]) => `<div class="st-it" data-at="${a}"><b>${v}</b><span>${s}</span></div>`).join("") + "</div>" },
      ],
    },
    LO4: {
      title: "Data is the foundation",
      script: "Picture robust quality as a building. Data quality is the foundation. Process quality and analytics quality stand on top of it. If the foundation is weak, the measurement is wrong, the analytics mislead, and the decisions fail, no matter how good the rest looks.",
      beats: [
        { at: 0, html: '<div class="st-kicker">Review · Integrate</div><h2 class="st-h">A building</h2>' },
        { at: 1, html: '<div class="st-stack"><div class="st-it crown" data-at="2">Robust quality</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="st-it top" data-at="2">Process</div><div class="st-it top" data-at="2">Analytics</div></div><div class="st-it base" data-at="1">Data quality</div></div>' },
        { at: 3, html: '<div class="st-chain"><div class="st-it bad" data-at="3">Measurement wrong</div><div class="arrow"><svg viewBox="0 0 16 30"><path d="M8 2v24M2 20l6 7 6-7"/></svg></div><div class="st-it bad" data-at="3">Analytics mislead</div><div class="arrow"><svg viewBox="0 0 16 30"><path d="M8 2v24M2 20l6 7 6-7"/></svg></div><div class="st-it bad" data-at="3">Decisions fail</div></div>' },
      ],
    },
  },
};
