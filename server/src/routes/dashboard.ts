import { Router } from 'express';
import { getPrisma } from '../lib/prisma';
import { updateInternStatuses } from '../utils/updateInternStatuses';
import ExcelJS from 'exceljs';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    await updateInternStatuses();
    const prisma = getPrisma();
    console.log('Dashboard route hit');

    const totalCompleted = await prisma.intern.count({ where: { status: 'Completed' } });
    const totalAllotted = await prisma.intern.count({ where: { status: 'Allotted' } });
    const waitlisted = await prisma.intern.count({ where: { status: 'Waitlisted' } });
    const pendingConfirmation = await prisma.intern.count({ where: { status: 'Matched' } });
    const leftCount = await prisma.intern.count({
  where: {
    status: 'Left',
  },
});
const yetToJoinCount = await prisma.intern.count({ where: { status: 'YetToJoin' } });
    const guides = await prisma.guide.findMany({
     // where: { is_complete: true },
      include: {
        interns: {
          where: { status: 'Allotted' },
          select: { id: true },
        },
      },
    });
    const longWaitlistedInterns = await prisma.intern.findMany({
      where: { status: 'Waitlisted' },
      include: { match_logs: { orderBy: { matched_at: 'desc' }, take: 1 } },
    });

    const guidesAtCapacity = guides.filter(
      (g) => g.interns.length >= g.max_capacity,
    ).length;

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const longWaitlisted = longWaitlistedInterns.filter((i) => {
      const log = i.match_logs[0];
      return log && log.matched_at < sevenDaysAgo;
    });

    res.json({
      total_completed: totalCompleted,
      total_allotted: totalAllotted,
      guides_at_capacity: guidesAtCapacity,
      left_count: leftCount,
      yet_to_join_count: yetToJoinCount,
      waitlisted,
      pending_confirmation: pendingConfirmation,
      long_waitlisted_count: longWaitlisted.length,
      long_waitlisted: longWaitlisted.map((i) => ({
        id: i.id,
        full_name: i.full_name,
        intern_type: i.intern_type,
        branch: i.branch,
        waiting_since: i.match_logs[0]?.matched_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});
router.get('/allotted-breakdown', async (req, res) => {
try {
const prisma = getPrisma();

const filter = req.query.filter as string;

if (filter === 'guide') {
  const guides = await prisma.guide.findMany({
    include: {
      interns: {
        where: {
          status: 'Allotted',
        },
        select: {
          id: true,
        },
      },
    },
  });

  return res.json(
    guides.map((g) => ({
      name: g.full_name,
      count: g.interns.length,
    }))
  );
}

if (filter === 'branch') {
  const branches = await prisma.intern.groupBy({
    by: ['branch'],
    where: {
      status: 'Allotted',
    },
    _count: {
      branch: true,
    },
  });

  return res.json(
    branches.map((b) => ({
      name: b.branch,
      count: b._count.branch,
    }))
  );
}

if (filter === 'department') {
  const departments = await prisma.intern.groupBy({
    by: ['department'],
    where: {
      status: 'Allotted',
    },
    _count: {
      department: true,
    },
  });

  return res.json(
    departments.map((d) => ({
      name: d.department || 'Unknown',
      count: d._count.department,
    }))
  );
}

return res.json([]);

} catch (err) {
console.error(err);
res.status(500).json({ error: 'Failed to load breakdown' });
}
});

router.get('/waitlisted-breakdown', async (_req, res) => {
  try {
    const prisma = getPrisma();

    const interns = await prisma.intern.findMany({
      where: {
        status: 'Waitlisted',
      },
      select: {
        branch: true,
      },
    });

    const counts: Record<string, number> = {};

    interns.forEach((intern) => {
      const key = intern.branch || 'Unknown';

      counts[key] = (counts[key] || 0) + 1;
    });

    const result = Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));

    result.sort((a, b) => b.count - a.count);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to load waitlisted breakdown',
    });
  }
});

router.get('/yet-to-join-breakdown', async (_req, res) => {
  try {
    const prisma = getPrisma();

    const interns = await prisma.intern.findMany({
      where: {
        status: 'YetToJoin',
      },
      select: {
        branch: true,
      },
    });

    const counts: Record<string, number> = {};

    interns.forEach((intern) => {
      const key = intern.branch || 'Unknown';

      counts[key] = (counts[key] || 0) + 1;
    });

    const result = Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));

    result.sort((a, b) => b.count - a.count);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to load waitlisted breakdown',
    });
  }
});

router.get('/allotted-download', async (req, res) => {
  try {
    const prisma = getPrisma();
    const filter = req.query.filter as string;

    const interns = await prisma.intern.findMany({
      where: {
        status: 'Allotted',
      },
      include: {
        assigned_guide: true,
      },
      orderBy:
        filter === 'guide'
          ? { assigned_guide_id: 'asc' }
          : { branch: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Allotted Interns');

    worksheet.columns = [
      { header: 'P No', key: 'pno', width: 15 },
      { header: 'Intern Name', key: 'name', width: 30 },
      {
        header: filter === 'guide' ? 'Guide' : 'Branch',
        key: 'group',
        width: 30,
      },
      { header: 'Start Date', key: 'startDate', width: 20 },
      { header: 'End Date', key: 'endDate', width: 20 },
    ];

    interns.forEach((intern) => {
      worksheet.addRow({
        pno: intern.p_no ?? '',
        name: intern.full_name,
        group:
          filter === 'guide'
            ? intern.assigned_guide?.full_name ?? ''
            : intern.branch,
        startDate: intern.start_date
          ? new Date(intern.start_date).toLocaleDateString('en-IN')
          : '',
        endDate: intern.end_date
          ? new Date(intern.end_date).toLocaleDateString('en-IN')
          : '',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=allotted-${filter}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to download allotted interns',
    });
  }
});

router.get('/waitlisted-download', async (_req, res) => {
  try {
    const prisma = getPrisma();

    const interns = await prisma.intern.findMany({
      where: {
        status: 'Waitlisted',
      },
      orderBy: {
        branch: 'asc',
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Waitlisted Interns');

    worksheet.columns = [
      { header: 'P No', key: 'pno', width: 15 },
      { header: 'Intern Name', key: 'name', width: 30 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Start Date', key: 'startDate', width: 20 },
      { header: 'End Date', key: 'endDate', width: 20 },
    ];

    interns.forEach((intern) => {
      worksheet.addRow({
        pno: intern.p_no ?? '',
        name: intern.full_name,
        branch: intern.branch,
        startDate: intern.start_date
          ? new Date(intern.start_date).toLocaleDateString('en-IN')
          : '',
        endDate: intern.end_date
          ? new Date(intern.end_date).toLocaleDateString('en-IN')
          : '',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=waitlisted-interns.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to download waitlisted interns',
    });
  }
});


router.get('/yet-to-join-download', async (_req, res) => {
  try {
    const prisma = getPrisma();

    const interns = await prisma.intern.findMany({
      where: {
        status: 'YetToJoin',
      },
      orderBy: {
        branch: 'asc',
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Yet to Join Interns');

    worksheet.columns = [
      { header: 'P No', key: 'pno', width: 15 },
      { header: 'Intern Name', key: 'name', width: 30 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Start Date', key: 'startDate', width: 20 },
      { header: 'End Date', key: 'endDate', width: 20 },
    ];

    interns.forEach((intern) => {
      worksheet.addRow({
        pno: intern.p_no ?? '',
        name: intern.full_name,
        branch: intern.branch,
        startDate: intern.start_date
          ? new Date(intern.start_date).toLocaleDateString('en-IN')
          : '',
        endDate: intern.end_date
          ? new Date(intern.end_date).toLocaleDateString('en-IN')
          : '',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=yet-to-join-interns.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to download yet to join interns',
    });
  }
});


export default router;
