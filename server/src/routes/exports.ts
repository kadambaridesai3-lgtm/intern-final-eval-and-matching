import express from 'express';
import { getPrisma } from '../lib/prisma';
import { generateStyledWorkbook } from '../utils/excelService';
import { getAllGuideFeedbacks } from '../services/guideFeedbackService';
import { isLate, isEarlyExit, getWorkingHours } from '../services/attendanceService';
import { getAllFinalEvaluations } from '../services/finalEvaluationService';
import { corporateLogger } from '../utils/logger';

const router = express.Router();
const prisma = getPrisma();

function sendWorkbookBuffer(res: express.Response, buffer: Buffer, filename: string) {
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
}

// GET /api/exports/intern-master
router.get('/intern-master', async (req, res) => {
  try {
    const interns = await prisma.intern.findMany({
      include: { assigned_guide: true }
    });

    const data = interns.map(r => ({
      'P No': r.p_no || '',
      'Candidate Name': r.full_name || '',
      'Guide Name': r.assigned_guide?.full_name || '',
      'Department': r.department || '',
      'College': r.college || '',
      'Branch': r.branch || '',
      'Qualification': r.intern_type || '',
      'Intern Type': r.intern_type || '',
      'Project Required': r.project_required || 'Yes',
      'Project Title': r.Project_title || '',
      'Project Domain': r.preferred_domain || '',
      'Date of Joining': r.start_date ? new Date(r.start_date).toLocaleDateString('en-IN') : '',
      'Date of Leaving': r.end_date ? new Date(r.end_date).toLocaleDateString('en-IN') : '',
      'Duration (Months)': r.duration_months,
      'Status': r.status || '',
      'Remarks': '',
    }));

    const headers = [
      'P No', 'Candidate Name', 'Guide Name', 'Department', 'College', 'Branch',
      'Qualification', 'Intern Type', 'Project Required', 'Project Title', 'Project Domain',
      'Date of Joining', 'Date of Leaving', 'Duration (Months)', 'Status', 'Remarks'
    ];
    const buffer = await generateStyledWorkbook('Intern Master', headers, data);
    
    await corporateLogger.log('AUDIT', 'Exports', 'Export Interns', 'Successfully exported Intern Master Excel file');
    const todayStr = new Date().toISOString().split('T')[0];
    sendWorkbookBuffer(res, buffer, `Intern_List_${todayStr}.xlsx`);
  } catch (error: any) {
    await corporateLogger.log('ERROR', 'Exports', 'Export Interns Failed', error.message || 'Export error');
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/exports/guide-feedback
router.get('/guide-feedback', async (req, res) => {
  try {
    const feedbacks = await getAllGuideFeedbacks();
    const data = feedbacks.map(fb => ({
      'P No': fb.intern?.p_no || '',
      'Candidate Name': fb.intern?.full_name || '',
      'Guide Name': fb.guide_name || '',
      'Department': fb.department || '',
      'Q5': fb.task_completion || '',
      'Q6': fb.quality_of_work || '',
      'Q7': fb.problem_solving || '',
      'Q8': fb.initiative_innovation || '',
      'Q9': fb.learning_adaptability || '',
      'Q10': fb.attendance_punctuality || '',
      'Guide Score': fb.guide_score ? `${(fb.guide_score ?? 0).toFixed(1)}` : '',
      'Remarks': '',
    }));

    const headers = [
      'P No', 'Candidate Name', 'Guide Name', 'Department',
      'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10',
      'Guide Score', 'Remarks'
    ];
    const buffer = await generateStyledWorkbook('Guide Feedback', headers, data);
    
    await corporateLogger.log('AUDIT', 'Exports', 'Export Guide Feedback', 'Successfully exported Guide Feedback Excel file');
    const todayStr = new Date().toISOString().split('T')[0];
    sendWorkbookBuffer(res, buffer, `Guide_Feedback_${todayStr}.xlsx`);
  } catch (error: any) {
    await corporateLogger.log('ERROR', 'Exports', 'Export Guide Feedback Failed', error.message || 'Export error');
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/exports/smart-card-punches
router.get('/smart-card-punches', async (req, res) => {
  try {
    const punches = await prisma.smartCardPunch.findMany({
      include: { intern: true }
    });

    const data = punches.map(p => {
      const late = isLate(p.in_time);
      const early = isEarlyExit(p.out_time);
      const hours = getWorkingHours(p.in_time, p.out_time);
      const status = late ? 'Late' : early ? 'Early Exit' : 'On Time';
      return {
        'P No': p.p_no || '',
        'Candidate Name': p.intern?.full_name || '',
        'Date': p.punch_date ? new Date(p.punch_date).toLocaleDateString('en-IN') : '',
        'In Time': p.in_time || '',
        'Out Time': p.out_time || '',
        'Working Hours': hours > 0 ? `${hours.toFixed(2)} hrs` : '',
        'Status': status,
        'Remarks': '',
      };
    });

    const headers = ['P No', 'Candidate Name', 'Date', 'In Time', 'Out Time', 'Working Hours', 'Status', 'Remarks'];
    const buffer = await generateStyledWorkbook('Smart Card Punches', headers, data);
    
    await corporateLogger.log('AUDIT', 'Exports', 'Export Smart Card Punches', 'Successfully exported Smart Card Punches Excel file');
    const todayStr = new Date().toISOString().split('T')[0];
    sendWorkbookBuffer(res, buffer, `Smart_Card_Attendance_${todayStr}.xlsx`);
  } catch (error: any) {
    await corporateLogger.log('ERROR', 'Exports', 'Export Smart Card Punches Failed', error.message || 'Export error');
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/exports/attendance-evaluation (Daily Attendance Export)
router.get('/attendance-evaluation', async (req, res) => {
  try {
    const records = await prisma.attendanceRecord.findMany({
      include: {
        intern: true
      },
      orderBy: { attendance_date: 'desc' }
    });

    const data = records.map(r => ({
      'P No': r.intern?.p_no || '',
      'Candidate Name': r.intern?.full_name || '',
      'Date': r.attendance_date ? new Date(r.attendance_date).toLocaleDateString('en-IN') : '',
      'Attendance Status': r.status || '',
      'Report Submitted': r.submitted_at ? 'Yes' : 'No',
      'Submission Time': r.submitted_at ? new Date(r.submitted_at).toLocaleTimeString('en-IN') : '',
      'Department': r.intern?.department || '',
      'Remarks': '',
    }));

    const headers = ['P No', 'Candidate Name', 'Date', 'Attendance Status', 'Report Submitted', 'Submission Time', 'Department', 'Remarks'];
    const buffer = await generateStyledWorkbook('Attendance Summary', headers, data);
    
    await corporateLogger.log('AUDIT', 'Exports', 'Export Attendance Summary', 'Successfully exported Attendance Summary Excel file');
    const todayStr = new Date().toISOString().split('T')[0];
    sendWorkbookBuffer(res, buffer, `Attendance_Evaluation_${todayStr}.xlsx`);
  } catch (error: any) {
    await corporateLogger.log('ERROR', 'Exports', 'Export Attendance Summary Failed', error.message || 'Export error');
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/exports/project-review/:reviewId
router.get('/project-review/:reviewId', async (req, res) => {
  try {
    const review = await prisma.projectReview.findUnique({
      where: { id: req.params.reviewId },
      include: { finalResults: { orderBy: { final_score: 'desc' } } }
    });

    if (!review) return res.status(404).json({ error: 'Review batch not found' });

    // Lookup interns to retrieve P No, Guide Name, and Department
    const interns = await prisma.intern.findMany({
      include: { assigned_guide: true }
    });
    const internMap = new Map(interns.map(i => [i.intern_id, i]));

    const data = review.finalResults.map((r) => {
      const intern = internMap.get(r.presenter_id);
      return {
        'P No': intern?.p_no || '',
        'Candidate Name': r.presenter_name,
        'Guide Name': intern?.assigned_guide?.full_name || '',
        'Department': intern?.department || '',
        'HR Score': r.hr_score || '',
        'Peer Average': r.peer_average || '',
        'Presentation Score': r.presentation_score || '',
        'Penalty': r.total_penalty || '',
        'Final Project Score': r.final_score || '',
        'Remarks': '',
      };
    });

    const headers = ['P No', 'Candidate Name', 'Guide Name', 'Department', 'HR Score', 'Peer Average', 'Presentation Score', 'Penalty', 'Final Project Score', 'Remarks'];
    const buffer = await generateStyledWorkbook('Project Review', headers, data);
    
    await corporateLogger.log('AUDIT', 'Exports', 'Export Project Review', 'Successfully exported Project Review Excel file');
    const todayStr = new Date().toISOString().split('T')[0];
    sendWorkbookBuffer(res, buffer, `Project_Review_${todayStr}.xlsx`);
  } catch (error: any) {
    await corporateLogger.log('ERROR', 'Exports', 'Export Project Review Failed', error.message || 'Export error');
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/exports/final-evaluation
router.get('/final-evaluation', async (req, res) => {
  try {
    const evaluations = await getAllFinalEvaluations();
    const data = evaluations.map(ev => ({
      'P No': ev.intern?.p_no || '',
      'Candidate Name': ev.intern?.full_name || '',
      'Guide Name': ev.intern?.guide_feedbacks?.[0]?.guide_name || '',
      'Department': ev.intern?.department || '',
      'Attendance Score': ev.attendance_score !== null ? ev.attendance_score : '',
      'Guide Score': ev.guide_score !== null ? ev.guide_score : '',
      'Project Score': ev.project_score !== null ? ev.project_score : '',
      'Final Score': ev.final_internship_score !== null ? ev.final_internship_score : '',
      'Grade': ev.final_internship_score !== null ? ev.grade : '',
      'Rank': ev.final_internship_score !== null && ev.rank > 0 ? ev.rank : '',
      'Remarks': ev.remarks || '',
    }));

    const headers = ['P No', 'Candidate Name', 'Guide Name', 'Department', 'Attendance Score', 'Guide Score', 'Project Score', 'Final Score', 'Grade', 'Rank', 'Remarks'];
    const buffer = await generateStyledWorkbook('Final Evaluations', headers, data);
    
    await corporateLogger.log('AUDIT', 'Exports', 'Export Final Evaluations', 'Successfully exported Final Evaluations Excel file');
    const todayStr = new Date().toISOString().split('T')[0];
    sendWorkbookBuffer(res, buffer, `Final_Internship_Evaluation_${todayStr}.xlsx`);
  } catch (error: any) {
    await corporateLogger.log('ERROR', 'Exports', 'Export Final Evaluations Failed', error.message || 'Export error');
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
