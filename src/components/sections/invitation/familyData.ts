export type FamilyMember = {
  name: string;
  grandparentsLabel: "Grand son of" | "Grand daughter of";
  grandparents: string;
  parentsLabel: "Son of" | "Daughter of";
  parents: string;
  siblingLabel: string;
  siblings: string;
};

export const familyIntro = {
  tagline: "Two Families. One Promise.",
  title: "Introducing",
  scriptTitle: "the families",
  groom: {
    name: "Mandeep",
    grandparentsLabel: "Grand son of",
    grandparents: "Late Dharamsingh Yadav & Late Charandai Yadav",
    parentsLabel: "Son of",
    parents: "Kuldeep Singh & Mona Yadav",
    siblingLabel: "Brother of",
    siblings: "Mukul Yadav",
  },
  bride: {
    name: "Ritika",
    grandparentsLabel: "Grand daughter of",
    grandparents: "Late Ramkishan Yadav & Anguri Devi",
    parentsLabel: "Daughter of",
    parents: "Bhanwar Singh & Kavita Yadav",
    siblingLabel: "Sister of",
    siblings: "Tarun Yadav",
  },
  monogram: {
    left: "M",
    right: "R",
  },
  footer: {
    lines: ["Raised with love,", "United by destiny,"],
    script: "together, forever",
  },
} satisfies {
  tagline: string;
  title: string;
  scriptTitle: string;
  groom: FamilyMember;
  bride: FamilyMember;
  monogram: { left: string; right: string };
  footer: { lines: string[]; script: string };
};
