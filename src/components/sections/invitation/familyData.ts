export type FamilyMember = {
  name: string;
  grandparentsLabel: "Grand son of" | "Grand daughter of";
  grandparents: string | readonly string[];
  parentsLabel: "Son of" | "Daughter of";
  parents: string;
  siblingLabel: string;
  siblings: string;
  extraRelationLabel?: string;
  extraRelation?: string;
};

export const familyIntro = {
  tagline: "Two Families. One Promise.",
  title: "Introducing",
  scriptTitle: "the families",
  groom: {
    name: "Shubham",
    grandparentsLabel: "Grand son of",
    grandparents: [
      "Late Bhagwat Prasad Ji &",
      "Late Jaivanti Devi Ji",
    ],
    parentsLabel: "Son of",
    parents: "Shri Rajesh & Sunita",
    siblingLabel: "Brother & Sister in law",
    siblings: "Rishabh & Shweta",
    extraRelationLabel: "Our little niece",
    extraRelation: "Shrisha",
  },
  bride: {
    name: "Harshi",
    grandparentsLabel: "Grand daughter of",
    grandparents: [
      "Late Prakash Chand Ji &",
      "Late Basant Rani Ji",
    ],
    parentsLabel: "Daughter of",
    parents: "Shri Rahul & Rajul",
    siblingLabel: "Sister of",
    siblings: "Harshit",
  },
  monogram: {
    left: "S",
    right: "H",
  },
  footer: {
    lines: ["SOMEHOW, WE FOUND EACH OTHER. SOMEHOW, IT WAS ALWAYS US"],
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
