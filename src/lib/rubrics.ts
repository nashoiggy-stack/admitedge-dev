// ── Common App 7 Criteria (scored 1-100) ──────────────────────────────────────

export const COMMON_APP_CRITERIA = [
  {
    name: "Authenticity",
    description:
      "Committees want to hear the applicant's unique voice. Authenticity is crucial — the essay should reflect who you are, including your thoughts, feelings, and personality. Throw out most of what your English teachers taught you about writing a formal essay. You don't want to be formal.",
  },
  {
    name: "Compelling Story",
    description:
      "A well-structured story that engages the reader. Your essay should have a clear beginning, middle, and end, and convey a compelling narrative. Don't think of it as an essay — think of it as a non-fiction creative writing piece.",
  },
  {
    name: "Insight",
    description:
      "A story is meaningless if you don't reflect on it in a meaningful and sustained way. Admissions officers look for depth of thought and the ability to reflect on experiences. Demonstrate self-awareness, personal growth, and how experiences have shaped you.",
  },
  {
    name: "Values",
    description:
      "Colleges want students who share the values of the college community — open-mindedness, desire to learn, and intellectual ambition. Your essay should make clear what you consider important in life: responsibility to family and friends, pursuit of knowledge, etc.",
  },
  {
    name: "Writing Skills",
    description:
      "Personal statements are a way for universities to evaluate writing abilities. If you've had good English teachers who taught you grammatically correct and clear sentences, you should be in good shape. Follow the basic rules of writing, even though personal statements should not sound like school essays.",
  },
  {
    name: "Passion",
    description:
      "Almost nothing wins application readers over more than a clear demonstration of passion. Whatever interests you, whatever drives you — show your readers why and how much you care.",
  },
  {
    name: "Ambition",
    description:
      "Admission committees want to see that you want to accomplish something beyond the norm. It doesn't mean becoming president or CEO. Whatever your passion and interests, convey the desire to accomplish something meaningful.",
  },
] as const;

// ── VSPICE Rubric (scored 1-4) ────────────────────────────────────────────────

export const VSPICE_CRITERIA = [
  {
    name: "Vulnerability",
    levels: {
      1: "The essay has no vulnerability or evidence it was written by a human being, OR the student showcases too much vulnerability and discusses trauma in a way that does not make them an attractive applicant.",
      2: "The essay barely showcases vulnerability (fear, doubt) OR communicates it in a cliche/boring way that fails to evoke sympathy.",
      3: "Vulnerability shown at least twice in the essay; reader can effectively feel the author's intention and emotion at each stage of their experience.",
      4: "Not only did the applicant discuss their vulnerability in an elegant, inspiring way, but they generated profound insights into their experience and how they plan to shape the future.",
    },
  },
  {
    name: "Selflessness",
    levels: {
      1: "Essay portrays no examples of selflessness, both in the examples stated throughout the essay as well as in the overall intention or final reflection of the piece.",
      2: "Moments of selflessness in the essay sound forced, unrealistic, and/or self-aggrandizing OR selflessness comes off as cliche, or forced (e.g. 'I gave up all of my sleep and free time to help them').",
      3: "Essay conveys selflessness genuinely and without exaggeration; author demonstrates self-awareness of their strengths and weaknesses (e.g. 'I didn't have experience making scarves, but I knew my friend needed help').",
      4: "Essay skillfully shows selflessness in impactful/vivid detail and might use other characters to work for the author (such as in the 'Relationship Essay'). Also combines selflessness with another dimension of the rubric masterfully (initiative, intellectual curiosity or ingenuity for instance).",
    },
  },
  {
    name: "Perseverance",
    levels: {
      1: "Essay shows no proof or mention of perseverance whatsoever.",
      2: "Essay describes perseverance with cliches/lacks development; focuses too little or too much on the author's struggles.",
      3: "Essay shows at least specific and convincing example of perseverance; reader can sympathize with and understand why the author is able to persevere.",
      4: "Essay not only highlights perseverance but also shows how the student grew from their struggles and/or will help others in similar situations (e.g. 'Through translating English documents for my immigrant parents, I've become more patient with my parents and myself').",
    },
  },
  {
    name: "Initiative",
    levels: {
      1: "Essay does not mention initiative/proactivity or offer any evidence that the student has gone above and beyond what has been expected of them.",
      2: "Essay somewhat conveys initiative but lacks emotional and analytical weight that's specific to the author (e.g. 'I stepped up because that was the right thing to do').",
      3: "Essay successfully communicates the author's initiative in a honest, compelling manner; has successfully made us root for them.",
      4: "Essay captures initiative while being inspiring (though not overly so) and personal; reader can see how the author's initiative/leadership also uplifts others (e.g. 'It was the first time I helped organize a protest at school. Despite my uncertainties, I knew my peers and I would be alright because we truly believed a better community was possible').",
    },
  },
  {
    name: "Curiosity",
    levels: {
      1: "Essay does not show curiosity (in particular, intellectual curiosity) clearly OR the author communicates their curiosity in an exaggerated, cringy way.",
      2: "Essay hints at the author's curiosity but reads disingenuous/not personal enough (e.g. 'I'm interested in physics because I want to understand how the world works').",
      3: "Essay displays curiosity in a believable and engaging way but lacks specific details that makes the reader sense their passion for the subject.",
      4: "The student's curiosity may not be necessarily unique, but it's described through an honest and personal lens that shows their genuine interest in learning; essay also effectively displays how the author uses their curiosity to help others (e.g. 'I wanted to make the beauty of animation more accessible — that's why I started a stick figure animation program at my local elementary school').",
    },
  },
  {
    name: "Expression",
    levels: {
      1: "Essay does not include the author's creativity/willingness to take risks OR the student overexaggerates their originality (e.g. 'It felt like I was born for doing [insert passion here]').",
      2: "Essay shows some creativity but gives generalized examples that do not highlight the student's passion/drive (e.g. 'The solution to [insert struggle here] came to me out of the blue').",
      3: "Essay effectively describes the student's creativity in a personal and original way, including the thought process and inspiration behind their choices.",
      4: "Essay contains not just novel solutions to problems in the applicant's life as well as creative insights into the experience, but also communicates this in a refreshing, original manner.",
    },
  },
] as const;

// ── VSPICE Pitfalls ───────────────────────────────────────────────────────────

export const VSPICE_PITFALLS = {
  minor: {
    label: "-1 (generally avoid)",
    items: [
      "Essay is about music, sports, trauma, parents' immigration story, etc. (it's easy to fall into cliches when writing about these stereotypical topics, but it is possible depending on how the student presents them; being personal is key)",
      "Essay is too philosophical",
      "Essay uses too much flowery language",
    ],
  },
  moderate: {
    label: "-2 (definitely don't want to include because)",
    items: [
      "The student is not making things happen/they are not the main character; essay is focused more on background info/other characters than on themselves",
      "Essay contains obvious insights (student can make insights original with a logical chain — e.g. 'I wanted to study more efficiently, so I began using the pomodoro method which made me realize...')",
      "The student is writing what they think the admissions officer wants to hear",
    ],
  },
  severe: {
    label: "-3 (you may get rejected because you did this)",
    items: [
      "Too much of the essay (over 50%) is about their problems/situation/circumstances, doesn't explain how they overcame them",
      "Essay lacks specificity; contains only chronological summaries instead of moments and analysis (it's helpful to show the parts of the student's life unique to them/the importance of the steps they took to find a solution)",
      "Moments in the essay sound forced/self-aggrandizing/patronizing",
    ],
  },
} as const;

// ── VSPICE Bonuses ────────────────────────────────────────────────────────────

export const VSPICE_BONUSES = {
  nice: {
    label: "+1 (nice to have!)",
    items: [
      "Essay blends in ways the student can contribute to a campus",
      "Essay makes bigger connections (i.e. summarizes the context and then moves onto broader discussion of the student's V-SPICE qualities)",
    ],
  },
  standout: {
    label: "+2 (will significantly help you stand out)",
    items: [
      "The student voices their vulnerabilities honestly (but doesn't overplay their struggles), giving their essay more depth",
      "Essay contains a strong hook and ending",
      "If the essay is picked up from a random pile, the author's close friends/family will be able to tell that the essay is the author's",
      "Essay is emotional; uses the 5 senses, dialogue, and moments",
      "Essay is analytical; includes action steps and reflection portion",
    ],
  },
  difference: {
    label: "+3 (if done properly can make the difference between acceptance vs. waitlist)",
    items: [
      "The student showcases their personal growth in an engaging manner that speaks both to the reader and to themselves",
      "Essay utilizes subversion on a sentence and/or broader story-level (e.g. 'I'm proud to say that my dad is the richest man I know — rich not in capital, but in character')",
    ],
  },
} as const;
