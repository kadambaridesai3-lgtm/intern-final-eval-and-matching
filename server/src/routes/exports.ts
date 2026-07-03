import express from 'express';
import { getPrisma } from '../lib/prisma';
import { generateStyledWorkbook } from '../utils/excelService';
import { getAllGuideFeedbacks } from '../services/guideFeedbackService';
import { getAllSummaries, isLate, isEarlyExit, getWorkingHours } from '../services/attendanceService';
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
      'Full Name': r.full_name || '',
      'Type': r.intern_type || '',
      'Branch': r.branch || '',
      'College': r.college || '',
      'Status': r.status || '',
      'Guide Name': r.assigned_guide?.full_name || '',
      'Guide P No': r.assigned_guide?.p_no || '',
      'Start Date': r.start_date ? new Date(r.start_date).toLocaleDateString('en-IN') : '',
      'Duration Months': r.duration_months,
      'End Date': r.end_date ? new Date(r.end_date).toLocaleDateString('en-IN') : '',
      'Project Required': r.project_required || 'Yes',
    }));

    const headers = ['P No', 'Full Name', 'Type', 'Branch', 'College', 'Status', 'Guide Name', 'Guide P No', 'Start Date', 'Duration Months', 'End Date', 'Project Required'];
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
      'Guide Name': fb.guide_name || '',
      'Dept.Name': fb.department || '',
      'P.No': fb.intern?.p_no || '',
      'Intern Name': fb.intern?.full_name || '',
      'Q5 Score': fb.task_completion || '',
      'Q6 Score': fb.quality_of_work || '',
      'Q7 Score': fb.problem_solving || '',
      'Q8 Score': fb.initiative_innovation || '',
      'Q9 Score': fb.learning_adaptability || '',
      'Q10 Score': fb.attendance_punctuality || '',
      'Q11 Score': fb.communication || '',
      'Q12 Score': fb.professionalism_ethics || '',
      'Q13 Score': fb.respect_authority || '',
      'Q14 Score': fb.accountability || '',
      'Q15 Score': fb.teamwork || '',
      'Q16 Score': fb.conflict_resolution || '',
      'Q17 Score': fb.empathy || '',
      'Q18 Score': fb.leadership_potential || '',
      'Q19 Score': fb.conflict_handling || '',
      'Total': fb.total_marks || '',
      'Percentage': fb.total_marks ? `${(fb.percentage ?? 0).toFixed(1)}%` : '',
    }));

    const headers = [
      'Guide Name', 'Dept.Name', 'P.No', 'Intern Name',
      'Q5 Score', 'Q6 Score', 'Q7 Score', 'Q8 Score', 'Q9 Score', 'Q10 Score',
      'Q11 Score', 'Q12 Score', 'Q13 Score', 'Q14 Score', 'Q15 Score', 'Q16 Score',
      'Q17 Score', 'Q18 Score', 'Q19 Score', 'Total', 'Percentage'
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
      return {
        'P No': p.p_no || '',
        'Date': p.punch_date ? new Date(p.punch_date).toLocaleDateString('en-IN') : '',
        'In Time': p.in_time || '',
        'Out Time': p.out_time || '',
        'Name': p.intern?.full_name || '',
        'Working Hours': hours > 0 ? `${hours.toFixed(2)} hrs` : '',
        'Late': late ? 'Yes' : 'No',
        'Early Exit': early ? 'Yes' : 'No',
      };
    });

    const headers = ['P No', 'Date', 'In Time', 'Out Time', 'Name', 'Working Hours', 'Late', 'Early Exit'];
    const buffer = await generateStyledWorkbook('Smart Card Punches', headers, data);
    
    await corporateLogger.log('AUDIT', 'Exports', 'Export Smart Card Punches', 'Successfully exported Smart Card Punches Excel file');
    const todayStr = new Date().toISOString().split('T')[0];
    sendWorkbookBuffer(res, buffer, `Smart_Card_Attendance_${todayStr}.xlsx`);
  } catch (error: any) {
    await corporateLogger.log('ERROR', 'Exports', 'Export Smart Card Punches Failed', error.message || 'Export error');
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/exports/attendance-evaluation
router.get('/attendance-evaluation', async (req, res) => {
  try {
    const summaries = await getAllSummaries();
    const data = summaries.map(s => ({
      'P No': s.intern?.p_no || '',
      'Name': s.intern?.full_name || '',
      'Working Days': s.total_working_days,
      'Present': s.present_days,
      'Genuine': s.genuine_days,
      'Attendance %': `${s.attendance_percentage.toFixed(1)}%`,
      'Sincerity %': `${s.sincerity_percentage.toFixed(1)}%`,
      'Score': s.attendance_score.toFixed(2),
      'Status': s.flagged ? 'Flagged' : 'OK',
    }));

    const headers = ['P No', 'Name', 'Working Days', 'Present', 'Genuine', 'Attendance %', 'Sincerity %', 'Score', 'Status'];
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

    const data = review.finalResults.map((r, idx) => ({
      'Rank': idx + 1,
      'P.No': r.presenter_id,
      'Name': r.presenter_name,
      'HR Score': r.hr_score || '',
      'Peer Average': r.peer_average || '',
      'Presentation Score': r.presentation_score || '',
      'Total Penalty': r.total_penalty || '',
      'Final Project Review Score': r.final_score || '',
    }));

    const headers = ['Rank', 'P.No', 'Name', 'HR Score', 'Peer Average', 'Presentation Score', 'Total Penalty', 'Final Project Review Score'];
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
      'Rank': ev.final_internship_score !== null && ev.rank > 0 ? ev.rank : '',
      'P No': ev.intern?.p_no || '',
      'Name': ev.intern?.full_name || '',
      'Department': ev.intern?.department || '',
      'Intern Status': ev.intern?.status || '',
      'Project Score': ev.project_score !== null ? ev.project_score : '',
      'Guide Score': ev.guide_score !== null ? ev.guide_score : '',
      'Attendance Score': ev.attendance_score !== null ? ev.attendance_score : '',
      'Final Score': ev.final_internship_score !== null ? ev.final_internship_score : '',
      'Grade': ev.final_internship_score !== null ? ev.grade : '',
      'Evaluation Method': ev.evaluation_method || '',
      'Remarks': ev.remarks || '',
    }));

    const headers = ['Rank', 'P No', 'Name', 'Department', 'Intern Status', 'Project Score', 'Guide Score', 'Attendance Score', 'Final Score', 'Grade', 'Evaluation Method', 'Remarks'];
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
