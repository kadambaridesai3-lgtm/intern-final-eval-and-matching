import { Router } from 'express';
import { getPrisma } from '../lib/prisma';
import { rankGuides, rankAllGuides, GuideInput } from '../utils/matching';
import { parseStringArray, toStoredStringArray } from '../utils/stringArray';
import { updateInternStatuses } from '../utils/updateInternStatuses';
import { generateNextInternId } from '../utils/internId';

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
    ...intern,p_no: intern.p_no ?? '',
    skills: parseStringArray(intern.skills),
    assigned_guide: normalizeGuide(intern.assigned_guide),
  };
}

export async function loadGuides(): Promise<GuideInput[]> {
  const guides = await getPrisma().guide.findMany({
    where: {},
    include: {
      interns: {
        where: { status: 'Allotted' },
        select: { id: true },
      },
    },
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

// GET /api/interns
router.get('/', async (req, res) => {
  try {
    await updateInternStatuses();
    const { status, intern_type, branch, search } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (intern_type) where.intern_type = intern_type;
    if (branch) where.branch = { contains: branch };
    if (search) {
      where.OR = [
        { full_name: { contains: search } },
        { skills: { contains: search } },
        { p_no: { contains: search } },
      ];
    }

    const interns = await getPrisma().intern.findMany({
      where,
      include: {
        assigned_guide: { select: { id: true, full_name: true, department: true } },
        match_logs: {
          orderBy: { matched_at: 'desc' },
          take: 1,
          select: { id: true, guide_id: true, match_score: true, matched_at: true, notes: true, confirmed_at: true, Allotted_at: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    console.log(interns.filter(i => i.status === 'Matched').map(i=>({name :i.full_name, guide : i.assigned_guide_id, status: i.status})));
    res.json(interns.map(normalizeIntern));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interns' });
  }
});

// POST /api/interns — create + auto-match
router.post('/', async (req, res) => {
  try {
    const {
      full_name, email, phone,p_no, intern_type, college, branch, department,
      graduation_year, cgpa, skills, preferred_domain,
      start_date, duration_months,end_date,
      twelfth_marks, tenth_marks, reference_name,
    } = req.body;

    if (!full_name || !email || !intern_type) {
      return res.status(400).json({ error: 'full_name, email, and intern_type are required' });
    }

    const guides = await loadGuides();
    const normalizedSkills = parseStringArray(skills);

    const internInput = {
      branch: branch ?? '',
      cgpa: Number(cgpa ?? 0),
      intern_type,
    };

    const ranked = rankGuides(internInput, guides);
    const topMatch = ranked[0] ?? null;

    const intern_id = await generateNextInternId();

    const intern = await getPrisma().intern.create({
      data: {
        intern_id,
        full_name,
        phone: phone ?? '',
        p_no: p_no ?? '',
        intern_type,
        college: college ?? '',
        branch: branch ?? '',
        department: department ?? '',
        graduation_year: Number(graduation_year ?? new Date().getFullYear()),
        cgpa: Number(cgpa ?? 0),
        twelfth_marks: twelfth_marks ? Number(twelfth_marks) : null,
        tenth_marks: tenth_marks ? Number(tenth_marks) : null,
        reference_name: reference_name ?? null,
        skills: toStoredStringArray(normalizedSkills),
        preferred_domain: preferred_domain ?? '',
        start_date: start_date ? new Date(start_date) : new Date(),
        duration_months: Number(duration_months ?? 3),
        end_date: end_date ? new Date(end_date) : new Date(),
        status: topMatch ? 'Matched' : 'Waitlisted',
        assigned_guide_id: topMatch?.guide_id ?? null,
      },
      include: { assigned_guide: true },
    });

    let matchLog = null;
    if (topMatch) {
      matchLog = await getPrisma().matchLog.create({
        data: {
          intern_id: intern.id,
          guide_id: topMatch.guide_id,
          match_score: topMatch.total_score,
        },
      });
    } else {
      // Store best-possible match in log for waitlist display
      const allGuidesFull = await getPrisma().guide.findMany({
        where: { is_complete: true },
        include: {
          interns: {
            where: { status: 'Allotted' },
            select: { id: true },
          },
        },
      });
      const allRanked = rankAllGuides(internInput, allGuidesFull.map((g) => ({
        id: g.id,
        full_name: g.full_name,
        required_skills: parseStringArray(g.required_skills),
        expertise_domains: parseStringArray(g.expertise_domains),
        preferred_intern_types: parseStringArray(g.preferred_intern_types),
        current_intern_count: g.interns.length,
        max_capacity: g.max_capacity,
      })));
      if (allRanked.length > 0) {
        matchLog = await getPrisma().matchLog.create({
          data: {
            intern_id: intern.id,
            guide_id: allRanked[0].guide_id,
            match_score: allRanked[0].total_score,
            notes: 'Waitlisted — best possible match if capacity opens.',
          },
        });
      }
    }

    res.status(201).json({ intern: normalizeIntern(intern), match_result: ranked.slice(0, 5), match_log: matchLog });
  } catch (err: unknown) {
    console.error(err);
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === 'P2002') {
      return res.status(409).json({ error: 'An intern with this email already exists' });
    }
    res.status(500).json({ error: 'Failed to create intern' });
  }
});

// GET /api/interns/:id
router.get('/:id', async (req, res) => {
  try {
    const intern = await getPrisma().intern.findUnique({
      where: { id: req.params.id },
      include: {
        assigned_guide: true,
        match_logs: {
          include: { guide: { select: { id: true, full_name: true, department: true } } },
          orderBy: { matched_at: 'desc' },
        },
      },
    });

    if (!intern) return res.status(404).json({ error: 'Intern not found' });

    res.json(normalizeIntern(intern));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch intern' });
  }
});

// PATCH /api/interns/:id/Project — update Project title and details
router.patch('/:id/Project', async (req, res) => {
  try {
    const { Project_title, Project_details } = req.body;
    const intern = await getPrisma().intern.update({
      where: { id: req.params.id },
      data: {
        Project_title: Project_title ?? null,
        Project_details: Project_details ?? null,
      },
      include: { assigned_guide: true, match_logs: { include: { guide: { select: { id: true, full_name: true, department: true } } }, orderBy: { matched_at: 'desc' } } },
    });
    res.json(normalizeIntern(intern));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update Project details' });
  }
});

// PATCH /api/interns/:id/confirm — HR confirms match → complete
router.patch('/:id/confirm', async (req, res) => {
  try {
    const { guide_id, notes } = req.body;

    const intern = await getPrisma().intern.findUnique({ where: { id: req.params.id } });
    if (!intern) return res.status(404).json({ error: 'Intern not found' });
    if (intern.status !== 'Matched') {
      return res.status(400).json({ error: 'Only Matched interns can be confirmed' });
    }

    const targetGuideId = guide_id ?? intern.assigned_guide_id;
    if (!targetGuideId) return res.status(400).json({ error: 'No guide to confirm' });

    const [updated] = await getPrisma().$transaction([
      getPrisma().intern.update({
        where: { id: req.params.id },
        data: { status: 'Allotted', assigned_guide_id: targetGuideId },
        include: { assigned_guide: true },
      }),
      getPrisma().matchLog.updateMany({
        where: { intern_id: req.params.id, guide_id: targetGuideId, confirmed_at: null },
        data: { confirmed_at: new Date(), ...(notes ? { notes } : {}) },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm match' });
  }
});

// PATCH /api/interns/:id/Allotted — mark Allotted, free guide slot, re-run waitlist
router.patch('/:id/completed', async (req, res) => {
  try {
    const intern = await getPrisma().intern.findUnique({ where: { id: req.params.id } });
    if (!intern) return res.status(404).json({ error: 'Intern not found' });
    if (intern.status !== 'Allotted') {
      return res.status(400).json({ error: 'Only Allotted interns can be marked Completed' });
    }

    const guideId = intern.assigned_guide_id;

    await getPrisma().$transaction([
      getPrisma().intern.update({
        where: { id: req.params.id },
        data: { status: 'Completed', assigned_guide_id: null },
      }),
      ...(guideId
        ? [getPrisma().matchLog.updateMany({
            where: { intern_id: req.params.id, guide_id: guideId, Allotted_at: null },
            data: { Allotted_at: new Date() },
          })]
        : []),
    ]);

    // Re-run waitlist matching after slot freed
    const waitlisted = await getPrisma().intern.findMany({ where: { status: 'Waitlisted' } });
    const guides = await loadGuides();
    const newlyMatched: string[] = [];

    for (const w of waitlisted) {
      const ranked = rankGuides(
        {
          branch: w.branch,
          cgpa: Number(w.cgpa),
          intern_type: w.intern_type,
        },
        guides,
      );
      if (ranked.length > 0) {
        const top = ranked[0];
        await getPrisma().intern.update({
          where: { id: w.id },
          data: { status: 'Matched', assigned_guide_id: top.guide_id },
        });
        await getPrisma().matchLog.create({
          data: {
            intern_id: w.id,
            guide_id: top.guide_id,
            match_score: top.total_score,
            notes: 'Auto-matched after slot opened.',
          },
        });
        const g = guides.find((x) => x.id === top.guide_id);
        if (g) g.current_intern_count += 1;
        newlyMatched.push(w.id);
      }
    }

    const updated = await getPrisma().intern.findUnique({ where: { id: req.params.id } });
    res.json({ intern: normalizeIntern(updated), newly_matched_from_waitlist: newlyMatched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to Allotted intern' });
  }
});

// DELETE /api/interns/:id
router.delete('/:id', async (req, res) => {
  try {
    await getPrisma().intern.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Intern deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete intern' });
  }
});

export default router;
