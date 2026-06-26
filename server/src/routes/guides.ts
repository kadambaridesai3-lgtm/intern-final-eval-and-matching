import { Router } from 'express';
import { getPrisma } from '../lib/prisma';
import { parseStringArray, toStoredStringArray } from '../utils/stringArray';
import { updateInternStatuses } from '../utils/updateInternStatuses';

const router = Router();
//console.log("Guides Route Loaded");
function normalizeGuide(guide: any) {
  if (!guide) return guide;
  return {
    ...guide,
    expertise_domains: parseStringArray(guide.expertise_domains),
    required_skills: parseStringArray(guide.required_skills),
    preferred_intern_types: parseStringArray(guide.preferred_intern_types),
  };
}

// GET /api/guides
router.get('/', async (_req, res) => {
  try {
    await updateInternStatuses();
    const guides = await getPrisma().guide.findMany({
      include: {
        interns: {
          where: { status: 'Allotted' },
          select: { id: true, full_name: true, status: true, intern_type: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    const result = guides.map((g) => ({
      ...normalizeGuide(g),
      current_intern_count: g.interns.length,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch guides' });
  }
});

// POST /api/guides
router.post('/', async (req, res) => {
  try {
    const {
      full_name,
      department,
      expertise_domains,
      required_skills,
      preferred_intern_types,
      max_capacity,
      is_complete,
    } = req.body;

    if (!full_name || !department) {
      return res.status(400).json({ error: 'full_name and department are required' });
    }

    const guide = await getPrisma().guide.create({
      data: {
        full_name,
        department,
        expertise_domains: toStoredStringArray(expertise_domains),
        required_skills: toStoredStringArray(required_skills),
        preferred_intern_types: toStoredStringArray(preferred_intern_types),
        max_capacity: max_capacity ?? 20,
        is_complete: is_complete ?? false,
      },
    });

    res.status(201).json({ ...normalizeGuide(guide), current_intern_count: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create guide' });
  }
});

// GET /api/guides/:id
router.get('/:id', async (req, res) => {
  try {
    //console.log("Put Guide Hit");
    //console.log("Body:", req.body);
    await updateInternStatuses();
    const guide = await getPrisma().guide.findUnique({
      where: { id: req.params.id },
      include: {
        interns: {
          select: {
            id: true,
            full_name: true,
            intern_type: true,
            branch: true,
            college: true,
            skills: true,
            status: true,
            start_date: true,
            duration_months: true,
          },
        },
        match_logs: {
          include: { intern: { select: { id: true, full_name: true, status: true } } },
          orderBy: { matched_at: 'desc' },
        },
      },
    });

    if (!guide) return res.status(404).json({ error: 'Guide not found' });

    const activeInterns = guide.interns.filter(
  (i) => i.status === 'Allotted',
);
    const completedInterns = guide.interns.filter((i) => i.status === 'Completed');

    const YetToJoinInterns = guide.interns.filter((i) => i.status === 'YetToJoin');

    const matchedInterns = guide.interns.filter((i) => i.status === 'Matched');
    res.json({
      ...normalizeGuide(guide),
      interns: guide.interns.map((i) => ({ ...i, skills: parseStringArray(i.skills) })),
      current_intern_count: activeInterns.length,
      active_count: activeInterns.length,
      completed_count: completedInterns.length,
      yet_to_join_count: YetToJoinInterns.length,
      matched_count: matchedInterns.length,
      matched_interns: matchedInterns.map((i) => ({ ...i, skills: parseStringArray(i.skills) })),
      active_interns: activeInterns.map((i) => ({ ...i, skills: parseStringArray(i.skills) })),
      completed_interns: completedInterns.map((i) => ({ ...i, skills: parseStringArray(i.skills) })),
      yet_to_join_interns: YetToJoinInterns.map((i) => ({ ...i, skills: parseStringArray(i.skills) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch guide' });
  }
});

// PUT /api/guides/:id
router.put('/:id', async (req, res) => {
  try {
    //console.log("UPDATE REQUEST RECIEVED");
    //console.log(req.body);
    const {
      full_name,
      department,
      expertise_domains,
      required_skills,
      preferred_intern_types,
      max_capacity,
      is_complete,
    } = req.body;

    const guide = await getPrisma().guide.update({
      where: { id: req.params.id },
      data: {
        ...(full_name !== undefined && { full_name }),
        ...(department !== undefined && { department }),
        ...(expertise_domains !== undefined && { expertise_domains: toStoredStringArray(expertise_domains) }),
        ...(required_skills !== undefined && { required_skills: toStoredStringArray(required_skills) }),
        ...(preferred_intern_types !== undefined && { preferred_intern_types: toStoredStringArray(preferred_intern_types) }),
        ...(max_capacity !== undefined && { max_capacity }),
        ...(is_complete !== undefined && { is_complete }),
      },
      include: {
        interns: {
          where: { status: 'Allotted' },
          select: { id: true },
        },
      },
    });
    //console.log("Updated guide");
    //console.log(guide);
    res.json({ ...normalizeGuide(guide), current_intern_count: guide.interns.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update guide' });
  }
});

export default router;
