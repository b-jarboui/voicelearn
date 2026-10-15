// Pilot course: PHQE820 Introduction to Data Quality.
// Narration scripts are written for listening, based on the slide deck (see ../source_intro_data_quality.md).
window.COURSE = {
  id: "phqe820-dq-intro",
  code: "PHQE820",
  title: "Introduction to Data Quality",
  subtitle: "Big Data Analytics · Week 2",
  author: "Prof. Bassem Jarboui",
  // Achievement reports are sent to the course teacher. Off for now; set sendReport: true (and an email) to enable.
  teacher: { name: "Prof. Bassem Jarboui", email: "", sendReport: false },
  lessons: [
    {
      id: "l1",
      title: "Why data quality matters",
      sections: [
        {
          title: "What you will learn",
          script:
            "Welcome to Introduction to Data Quality, part of P H Q E 820, Big Data Analytics. By the end of this short course you will be able to do four things. First, define data quality as fitness for purpose. Second, recognise the common dimensions of data quality and the problems they cause in real datasets. Third, describe the preparatory analytics steps that must happen before any machine learning model is built. And fourth, connect data quality to the wider framework of robust quality.",
        },
        {
          title: "The one key message",
          script:
            "If you remember one thing today, make it this. If the data is not trustworthy, the outcome fails. Data quality is not optional. It is the foundation of robust decision making. When data quality is poor, three things go wrong in a chain. The quality measurement itself is incorrect. The analytics built on it give misleading results. And the improvement decisions taken from those results will be wrong.",
        },
        {
          title: "Key vocabulary",
          script:
            "Let's fix five terms. Data quality is the degree to which data is fit for its intended purpose. A measurement system is the people, tools and methods used to generate data. A K P I, or key performance indicator, is a measurable value used to evaluate performance. Preparatory analytics is the analytical work done before modelling, to assess the health of the data. And robust quality is the integrated measurement of three things together: process quality, data quality, and analytics quality.",
        },
      ],
      activities: [
        {
          id: "l1-q1",
          type: "mcq",
          prompt: "Which statement best defines data quality?",
          options: [
            "Data that contains no errors at all",
            "The degree to which data is fit for its intended purpose",
            "Having a very large volume of data",
            "Data that is stored in a secure database",
          ],
          answer: 1,
          explain:
            "Data quality is fitness for purpose. Data does not need to be perfect. It needs to be good enough for the decision it supports.",
        },
      ],
    },
    {
      id: "l2",
      title: "Fitness for purpose and the six dimensions",
      sections: [
        {
          title: "Fitness for purpose",
          script:
            "Data quality is not just clean data. It depends on context. Data must be good enough to support a specific goal, and different goals need different things. A dashboard needs timeliness and consistency, because people act on it every day. A predictive model needs accurate labels and stable data, or it learns the wrong patterns. A quality audit needs complete and traceable records, so every figure can be checked back to its source.",
        },
        {
          title: "Six core dimensions",
          script:
            "Data quality is usually described through six core dimensions. Accuracy means the values reflect reality. Completeness means the required fields are present. Consistency means there are no contradictions between records or systems. Timeliness means the data is available when it is needed. Uniqueness means no entity is recorded twice. And integrity means the relationships between records are correct.",
        },
      ],
      activities: [
        {
          id: "l2-q1",
          type: "mcq",
          prompt:
            "A daily operations dashboard only receives yesterday's figures a week later. Which dimension is failing?",
          options: ["Accuracy", "Uniqueness", "Timeliness", "Integrity"],
          answer: 2,
          explain:
            "Timeliness. The numbers may be correct, but they arrive too late for the purpose of a daily dashboard.",
        },
      ],
    },
    {
      id: "l3",
      title: "Dimensions in practice",
      sections: [
        {
          title: "Accuracy, completeness, consistency",
          script:
            "Here is what each dimension looks like when it fails. Accuracy: a sensor reads ninety-five degrees Celsius when the true temperature is seventy-five. Completeness: twenty percent of customer delivery times are missing from the logs. Consistency: the same product I D has different names in two systems, for example the E R P and the C R M.",
        },
        {
          title: "Timeliness, validity, integrity",
          script:
            "Timeliness: critical customer complaints arrive ten days after the event, too late to act. Validity: a patient record shows a negative waiting time, which is impossible. Integrity: an order is linked to a customer I D that does not exist. Validity means values must obey the rules of their field, such as ranges, formats and allowed codes.",
        },
      ],
      activities: [
        {
          id: "l3-q1",
          type: "mcq",
          prompt:
            "A dataset contains waiting time for patients. Some records show a waiting time of minus 15 minutes. What does this indicate?",
          options: [
            "Normal variation in the process",
            "A data quality problem",
            "Patients were served before they arrived",
            "An excellent service level",
          ],
          answer: 1,
          explain:
            "A negative waiting time is a validity failure: an impossible value. Likely causes are an incorrect timestamp sequence, a time zone mismatch between systems, or inconsistent definitions of when waiting starts and ends. The right action is to investigate the measurement system and its capture rules.",
        },
      ],
    },
    {
      id: "l4",
      title: "The preparatory analytics workflow",
      sections: [
        {
          title: "Five steps before modelling",
          script:
            "Before any machine learning modelling, work through five preparatory steps. Step one, understanding: learn the meaning of each field, its units, and where the data comes from. Step two, profiling: detect missing values, outliers and errors. Step three, cleaning: impute missing data and standardise formats. Step four, integration: merge sources such as E R P, I o T and C R M correctly. Step five, validation: check the result with a domain expert and against a data dictionary.",
        },
        {
          title: "Profiling and integration up close",
          script:
            "Two of these steps deserve a closer look. Profiling is diagnostic. It quantifies missing values, the shape of distributions, and drift over time, all before modelling begins. Integration is where many projects go wrong. When you combine E R P data, I o T data and machine logs, the risks are wrong joins, mismatched keys, and time alignment errors.",
        },
      ],
      activities: [
        {
          id: "l4-s1",
          type: "short",
          prompt: "Name the five steps of the preparatory analytics workflow, in order.",
          keywords: [
            ["understanding", "understand"],
            ["profiling", "profile"],
            ["cleaning", "clean"],
            ["integration", "integrate", "merge", "merging"],
            ["validation", "validate"],
          ],
          keywordNames: ["understanding", "profiling", "cleaning", "integration", "validation"],
        },
      ],
    },
    {
      id: "l5",
      title: "Case studies: when data distorts reality",
      sections: [
        {
          title: "Defect rate errors",
          script:
            "Can data quality distort reality? Consider a factory that reports its defect rate as defects divided by total units. Now suppose night shift defects are not recorded, duplicate records inflate the counts, and production logs for some units are missing. The reported rate looks better than before. Management believes quality has improved, but the reality is worse.",
        },
        {
          title: "Predicting late deliveries",
          script:
            "A logistics company predicts late deliveries using G P S, traffic and scan data, to prevent failures before they happen. But G P S signal points go missing, manual scans are delayed, and delivery identifiers are duplicated. The effect is that the model learns noise instead of patterns, and sends incorrect optimisation alerts.",
        },
        {
          title: "The foundation of robust quality",
          script:
            "These cases share one lesson. Data quality is the foundation of robust quality. Process quality and analytics quality can only be as good as the data underneath them. That completes the lessons. Next comes a short spoken reflection, and then your written assignment.",
        },
      ],
      activities: [
        {
          id: "l5-r1",
          type: "reflection",
          prompt:
            "Think of one dataset you use at work. Which data quality dimension is most at risk in it, and why? Speak for about a minute.",
        },
        {
          id: "l5-e1",
          type: "essay",
          prompt:
            "Assignment. Describe a real or realistic data quality problem in your organisation. Identify which dimensions are affected, explain how the problem could distort decisions, and propose how the preparatory analytics workflow would detect and fix it. Aim for 300 to 500 words.",
        },
      ],
    },
  ],
};
