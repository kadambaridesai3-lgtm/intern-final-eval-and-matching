import { Router } from 'express';
import { getPrisma } from '../lib/prisma';
import { rankGuides, rankAllGuides, GuideInput } from '../utils/matching';
import { parseStringArray } from '../utils/stringArray';

const router = Router();

function normalizeGuide(guide: any) {
  if (!guide) return guide;
  return {
    ...guide,
    required_skills: parseStringArray(guide.required_skills),
    expertise_domains: parseStringArray(guide.expertise_domains),
    preferred_intern_types: parseStringArray(guide.preferred_intern_types),
  };
}

function normalizeIntern(intern: any) {
  if (!intern) return intern;
  return {
    ...intern,
    skills: parseStringArray(intern.skills),
    assigned_guide: normalizeGuide(intern.assigned_guide),
  };
}

async function loadGuides(): Promise<GuideInput[]> {
  const guides = await getPrisma().guide.findMany({
    where: {},
    include: {
      interns: {
        where: { status: 'Allotted' },
        select: { id: true },
      },
    },
  });
  //console.log("GUIDES LOADED:");
guides.forEach(g => {
  console.log(
    g.full_name,
    g.preferred_intern_types,
    g.expertise_domains
  );
});
  return guides.map((g) => ({
    id: g.id,
    full_name: g.full_name,
    required_skills: parseStringArray(g.required_skills),
    expertise_domains: parseStringArray(g.expertise_domains),
    preferred_intern_types: parseStringArray(g.preferred_intern_types),
    current_intern_count: g.interns.length,
    max_capacity: g.max_capacity,
  }));
}

// GET /api/match/:internId — ranked guide list for an intern
router.get('/:internId', async (req, res) => {
  try {
    const intern = await getPrisma().intern.findUnique({
      where: { id: req.params.internId },
      include: { assigned_guide: true },
    });

    if (!intern) return res.status(404).json({ error: 'Intern not found' });

    const allGuidesFull = await getPrisma().guide.findMany({
      where: {},
      include: {
        interns: {
          where: { status: 'Allotted' },
          select: { id: true },
        },
      },
    });

    const guideDetails = new Map(allGuidesFull.map((g) => [g.id, g]));

    const internInput = {
      branch: intern.branch,
      cgpa: Number(intern.cgpa),
      intern_type: intern.intern_type,
    };

    const ranked = rankAllGuides(internInput, allGuidesFull.map((g) => ({
      id: g.id,
      full_name: g.full_name,
      required_skills: parseStringArray(g.required_skills),
      expertise_domains: parseStringArray(g.expertise_domains),
      preferred_intern_types: parseStringArray(g.preferred_intern_types),
      current_intern_count: g.interns.length,
      max_capacity: g.max_capacity,
    })));
//     console.log(
//   "Intern:",
//   intern.full_name,
//   "Branch:",
//   intern.branch,
//   "Type:",
//   intern.intern_type,
//   "Matches found:",
//   ranked.length
// );

    const enriched = ranked.slice(0, 5).map((r) => {
      const gd = guideDetails.get(r.guide_id)!;
      return {
        ...r,
        guide: {
          id: gd.id,
          full_name: gd.full_name,
          department: gd.department,
          expertise_domains: parseStringArray(gd.expertise_domains),
          required_skills: parseStringArray(gd.required_skills),
          max_capacity: gd.max_capacity,
          current_intern_count: gd.interns.length,
          is_at_capacity: gd.interns.length >= gd.max_capacity,
        },
      };
    });
    res.json({ intern: normalizeIntern(intern), matches: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to run matching' });
  }
});

// POST /api/match/run — re-run matching for all Waitlisted interns
router.post('/run', async (_req, res) => {
  try {

    // Reset all previously matched interns
    await getPrisma().intern.updateMany({
      where: {
        status: 'Matched',
      },
      data: {
        status: 'Waitlisted',
        assigned_guide_id: null,
      },
    });

    // Load latest guide preferences AFTER reset
    const guides = await loadGuides();

    // Reload all waitlisted interns
    const waitlisted = await getPrisma().intern.findMany({
  where: {
    status: 'Waitlisted',
  },
});

console.log(
  "Total interns to recalculate:",
  waitlisted.length
);

    const nowMatchable: string[] = [];

    for (const intern of waitlisted) {
      const internInput = {
        branch: intern.branch,
        cgpa: Number(intern.cgpa),
        intern_type: intern.intern_type,
      };

      // const ranked = rankGuides(internInput, guides);

      // // console.log(
      // //   intern.full_name,
      // //   intern.branch,
      // //   intern.intern_type,
      // //   "Matches:",
      // //   ranked.length
      // // );

      // if (ranked.length > 0) {
      //   const top = ranked[0];

      //   await getPrisma().intern.update({
      //     where: { id: intern.id },
      //     data: {
      //       status: 'Matched',
      //       assigned_guide_id: top.guide_id,
      //     },
      //   });

      //   await getPrisma().matchLog.create({
      //     data: {
      //       intern_id: intern.id,
      //       guide_id: top.guide_id,
      //       match_score: top.total_score,
      //       notes: 'Auto-matched after waitlist slot opened.',
      //     },
      //   });

      //   const g = guides.find((x) => x.id === top.guide_id);
      //   if (g) g.current_intern_count += 1;

      //   nowMatchable.push(intern.id);
      // } else {
      //   await getPrisma().intern.update({
      //     where: { id: intern.id },
      //     data: {
      //       status: 'Waitlisted',
      //       assigned_guide_id: null,
      //     },
      //   });

      //   //console.log("Moved to Waitlisted:", intern.full_name);
      // }
      const ranked = rankGuides(internInput, guides);

console.log(
  "Intern:",
  intern.full_name,
  "| Branch:",
  intern.branch,
  "| Type:",
  intern.intern_type,
  "| Ranked Count:",
  ranked.length
);

if (ranked.length > 0) {
  const top = ranked[0];

  console.log(
    "MATCHED:",
    intern.full_name,
    "->",
    top.guide_id
  );

  await getPrisma().intern.update({
    where: { id: intern.id },
    data: {
      status: 'Matched',
      assigned_guide_id: top.guide_id,
    },
  });

  await getPrisma().matchLog.create({
    data: {
      intern_id: intern.id,
      guide_id: top.guide_id,
      match_score: top.total_score,
      notes: 'Auto-matched after waitlist slot opened.',
    },
  });

  const g = guides.find((x) => x.id === top.guide_id);
  if (g) g.current_intern_count += 1;

  nowMatchable.push(intern.id);
} else {
  console.log(
    "WAITLISTED:",
    intern.full_name
  );

  await getPrisma().intern.update({
    where: { id: intern.id },
    data: {
      status: 'Waitlisted',
      assigned_guide_id: null,
    },
  });
}
    }

    res.json({
      processed: waitlisted.length,
      newly_matched: nowMatchable.length,
      matched_intern_ids: nowMatchable,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to run waitlist matching' });
  }
});

export default router;
