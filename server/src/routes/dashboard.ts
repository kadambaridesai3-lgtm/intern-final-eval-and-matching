import { Router } from 'express';
import { getPrisma } from '../lib/prisma';
import { updateInternStatuses } from '../utils/updateInternStatuses';
import ExcelJS from 'exceljs';
import { getAllFinalEvaluations, requiresProjectReview } from '../services/finalEvaluationService';

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
    const totalInterns = await prisma.intern.count({
      where: {
        status: { in: ['Applied', 'Matched', 'Allotted', 'Completed', 'Ongoing'] }
      }
    });

    const guides = await prisma.guide.findMany({
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

    // Project vs Support Interns (Manual & Domain checked)
    const allActiveInterns = await prisma.intern.findMany({
      where: {
        status: { in: ['Applied', 'Matched', 'Allotted', 'Completed', 'Ongoing'] }
      }
    });

    let projectInternsCount = 0;
    let supportInternsCount = 0;

    for (const intern of allActiveInterns) {
      if (requiresProjectReview(intern)) {
        projectInternsCount++;
      } else {
        supportInternsCount++;
      }
    }

    // Averages
    const attendanceAvgRecord = await prisma.attendanceSummary.aggregate({
      _avg: { attendance_percentage: true }
    });
    const attendanceAverage = attendanceAvgRecord._avg.attendance_percentage || 0;

    const guideFeedbackAvgRecord = await prisma.guideFeedback.aggregate({
      _avg: { guide_score: true }
    });
    const guideAverage = guideFeedbackAvgRecord._avg.guide_score || 0;

    const projectAvgRecord = await prisma.finalResult.aggregate({
      _avg: { final_score: true }
    });
    const projectAverage = projectAvgRecord._avg.final_score || 0;

    // Final Evaluation Details for performer stats
    const finalEvaluations = await getAllFinalEvaluations();
    const evaluatedWithScores = finalEvaluations.filter((e: any) => e.final_internship_score !== null && e.final_internship_score > 0);

    let finalAverage = 0;
    if (evaluatedWithScores.length > 0) {
      const sum = evaluatedWithScores.reduce((acc: number, cur: any) => acc + cur.final_internship_score, 0);
      finalAverage = sum / evaluatedWithScores.length;
    }

    let topPerformer = null;
    let bottomPerformer = null;
    if (evaluatedWithScores.length > 0) {
      const sorted = [...evaluatedWithScores].sort((a: any, b: any) => b.final_internship_score - a.final_internship_score);
      topPerformer = {
        name: sorted[0].intern?.full_name || 'Unknown',
        intern_id: sorted[0].intern_id,
        score: sorted[0].final_internship_score
      };
      bottomPerformer = {
        name: sorted[sorted.length - 1].intern?.full_name || 'Unknown',
        intern_id: sorted[sorted.length - 1].intern_id,
        score: sorted[sorted.length - 1].final_internship_score
      };
    }

    const completedReviews = finalEvaluations.filter((e: any) => e.evaluation_status === 'Complete').length;
    const pendingReviews = finalEvaluations.filter((e: any) => e.evaluation_status !== 'Complete').length;

    // Charts Data
    // Department Wise
    const deptGroup = await prisma.intern.groupBy({
      by: ['department'],
      _count: { id: true },
      where: {
        status: { in: ['Applied', 'Matched', 'Allotted', 'Completed', 'Ongoing'] }
      }
    });
    const departmentWise = deptGroup.map(g => ({
      name: g.department || 'General',
      count: g._count.id
    }));

    // College Wise
    const collegeGroup = await prisma.intern.groupBy({
      by: ['college'],
      _count: { id: true },
      where: {
        status: { in: ['Applied', 'Matched', 'Allotted', 'Completed', 'Ongoing'] }
      }
    });
    const collegeWise = collegeGroup.map(g => ({
      name: g.college || 'Other',
      count: g._count.id
    })).sort((a,b) => b.count - a.count).slice(0, 10);

    // Guide Wise
    const guideGroup = await prisma.intern.groupBy({
      by: ['assigned_guide_id'],
      _count: { id: true },
      where: {
        status: 'Allotted'
      }
    });
    const guideWise = [];
    for (const item of guideGroup) {
      if (item.assigned_guide_id) {
        const gd = guides.find(g => g.id === item.assigned_guide_id);
        if (gd) {
          guideWise.push({
            name: gd.full_name,
            count: item._count.id
          });
        }
      }
    }

    // Monthly Joined
    const monthlyWiseMap: Record<string, number> = {};
    for (const intern of allActiveInterns) {
      if (intern.start_date) {
        const date = new Date(intern.start_date);
        const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        monthlyWiseMap[monthName] = (monthlyWiseMap[monthName] || 0) + 1;
      }
    }
    const monthlyWise = Object.entries(monthlyWiseMap).map(([name, count]) => ({
      name,
      count
    }));

    // Recent Uploads
    const recentUploads = await prisma.uploadHistory.findMany({
      orderBy: { upload_time: 'desc' },
      take: 5
    });

    // Recent Activity (we'll fetch from corporate audit log)
    const recentActivity = await prisma.corporateAuditLog.findMany({
      orderBy: { date_time: 'desc' },
      take: 10
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

      // Corporate enhanced fields
      total_interns: totalInterns,
      project_interns: projectInternsCount,
      support_interns: supportInternsCount,
      completed_reviews: completedReviews,
      pending_reviews: pendingReviews,
      attendance_average: Math.round(attendanceAverage * 100) / 100,
      guide_average: Math.round(guideAverage * 100) / 100,
      project_average: Math.round(projectAverage * 100) / 100,
      final_average: Math.round(finalAverage * 100) / 100,
      top_performer: topPerformer,
      bottom_performer: bottomPerformer,
      recent_uploads: recentUploads,
      recent_activity: recentActivity,
      charts: {
        department_wise: departmentWise,
        college_wise: collegeWise,
        guide_wise: guideWise,
        monthly_wise: monthlyWise
      }
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
