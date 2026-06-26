export interface InternInput {
  branch: string;
  cgpa: number;
  intern_type: string;
}

export interface GuideInput {
  id: string;
  full_name: string;
  required_skills: string[];
  expertise_domains: string[];
  preferred_intern_types: string[];
  current_intern_count: number;
  max_capacity: number;
}

export interface MatchResult {
  guide_id: string;
  total_score: number;
  branch_score: number;
  cgpa_score: number;
  intern_type_score: number;
  current_intern_count: number;
}

function skillScore(
  internSkills: string[],
  guideSkills: string[],
): { score: number; matched: string[] } {
  if (guideSkills.length === 0) return { score: 0, matched: [] };

  const lower = internSkills.map((s) => s.toLowerCase());
   const matched = guideSkills.filter((gs) =>
  lower.some((s) =>
    s.includes(gs.toLowerCase()) ||
    gs.toLowerCase().includes(s)
  )
);

  return {
    score: matched.length / guideSkills.length,
    matched,
  };
}

function domainScore(
  branch: string,
  preferredDomain: string,
  expertiseDomains: string[],
): number {
  const bLow = branch.toLowerCase();
  const pLow = preferredDomain.toLowerCase();
  const eLow = expertiseDomains.map((d) => d.toLowerCase());

  // Full match: exact equality
  if (eLow.some((e) => e === bLow || e === pLow)) return 1.0;

  // Partial match: substring containment
  if (
    eLow.some(
      (e) =>
        e.includes(bLow) ||
        bLow.includes(e) ||
        e.includes(pLow) ||
        pLow.includes(e),
    )
  )
    return 0.5;

  return 0.0;
}

function cgpaScore(cgpa: number): number {
  return Math.min(cgpa / 10, 1.0);
}
function internTypeScore(
  internType: string,
  preferredTypes: string[],
): number {
  if (preferredTypes.length === 0) return 1;

  return preferredTypes.some(
    (t) => t.toLowerCase() === internType.toLowerCase(),
  )
    ? 1
    : 0;
}
// export function rankGuides(
//   intern: InternInput,
//   guides: GuideInput[],
// ): MatchResult[] {
//   const eligible = guides.filter(
//     (g) => g.current_intern_count < g.max_capacity,
//   );

//   const results: MatchResult[] = eligible.map((guide) => {
//     const { score: ss, matched } = skillScore(inter, guide.required_skills);
//     const ds = domainScore(intern.branch, intern.preferred_domain, guide.expertise_domains);
//     const cs = cgpaScore(intern.cgpa);
//     const ts = internTypeScore(
//   intern.intern_type,
//   guide.preferred_intern_types,
// );
//     const total = ss * 0.35 + ds * 0.35 + cs * 0.15 + ts * 0.15;

//     return {
//       guide_id: guide.id,
//       total_score: Math.round(total * 10000) / 10000,
//       skill_score: Math.round(ss * 10000) / 10000,
//       domain_score: ds,
//       cgpa_score: Math.round(cs * 10000) / 10000,
//       matched_skills: matched,
//       total_guide_skills: guide.required_skills.length,
//       current_intern_count: guide.current_intern_count,
//     };
//   });

//   return results
//   .filter((r) => r.total_score > 0)
//   .sort((a, b) => {
//     const diff = b.total_score - a.total_score;
//     if (Math.abs(diff) > 0.0001) return diff;
//     return a.current_intern_count - b.current_intern_count;
//   });
// }
export function rankGuides(
  intern: InternInput,
  guides: GuideInput[],
): MatchResult[] {

  const eligible = guides.filter(
    (g) => g.current_intern_count < g.max_capacity
  );
  const perfectMatches: MatchResult[] = [];
  const partialMatches: MatchResult[] = [];
  const results = eligible.map((guide) => {

    const branchMatch = guide.expertise_domains.some(
      (d) =>
        d.toLowerCase().includes(intern.branch.toLowerCase()) ||
        intern.branch.toLowerCase().includes(d.toLowerCase())
    );

    const typeMatch = guide.preferred_intern_types.some(
      (t) =>
        t.toLowerCase().includes(intern.intern_type.toLowerCase()) ||
        intern.intern_type.toLowerCase().includes(t.toLowerCase())
    );

    // CRITICAL FIX
    if (!branchMatch && !typeMatch) {
      return null;
    }

    let score = 0;

    const result: MatchResult = {
  guide_id: guide.id,
  total_score: intern.cgpa,
  branch_score: branchMatch ? 100 : 0,
  cgpa_score: intern.cgpa,
  intern_type_score: typeMatch ? 100 : 0,
  current_intern_count: guide.current_intern_count,
};

if (branchMatch && typeMatch) {
  perfectMatches.push(result);
}
else if (branchMatch || typeMatch) {
  partialMatches.push(result);
}
  });

  if (perfectMatches.length > 0) {
  return perfectMatches.sort(
    (a, b) => b.cgpa_score - a.cgpa_score
  );
}

return partialMatches.sort(
  (a, b) => b.cgpa_score - a.cgpa_score
);
}
// Same as rankGuides but includes full guides (for waitlist display)
export function rankAllGuides(
  intern: InternInput,
  guides: GuideInput[],
): MatchResult[] {

  const results = guides.map((guide) => {

    let score = 0;

    // Branch matching
    const branchMatch = guide.expertise_domains.some(
  (d) =>
    d.toLowerCase().includes(intern.branch.toLowerCase()) ||
    intern.branch.toLowerCase().includes(d.toLowerCase())
);

const typeMatch = guide.preferred_intern_types.some(
  (t) =>
    t.toLowerCase().includes(intern.intern_type.toLowerCase()) ||
    intern.intern_type.toLowerCase().includes(t.toLowerCase())
);

//     console.log(
//   "Intern Type:",
//   intern.intern_type,
//   "| Guide Types:",
//   guide.preferred_intern_types,
//   "| Type Match:",
//   typeMatch
// );

    if (!branchMatch && !typeMatch) {
  // console.log(
  //   "REJECTED ->",
  //    "intern",
  //   "| Branch:",
  //   intern.branch,
  //   "| Type:",
  //   intern.intern_type
  // );
  return null;
}

     if (branchMatch) score += 60;
if (typeMatch) score += 30;

score += intern.cgpa;

  return {
  guide_id: guide.id,
  total_score: score,
  branch_score: branchMatch ? 100 : 0,
  cgpa_score: intern.cgpa,
  intern_type_score: typeMatch ? 100 : 0,
  current_intern_count: guide.current_intern_count,
};
  });

  return results
  .filter((r): r is MatchResult => r !== null)
  .sort((a, b) => b.total_score - a.total_score);
}