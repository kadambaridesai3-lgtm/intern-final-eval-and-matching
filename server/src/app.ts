import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

import internRoutes from './routes/interns';
import ProjectReviewRoutes from'./routes/projectReview';
import guideRoutes from './routes/guides';
import matchRoutes from './routes/match';
import dashboardRoutes from './routes/dashboard';
import importRoutes from './routes/imports';
import attendanceRoutes from './routes/attendance';
import guideFeedbackRoutes from './routes/guideFeedback';
import finalEvaluationRoutes from './routes/finalEvaluation';
import exportsRoutes from './routes/exports';
import uploadHistoryRoutes from './routes/uploadHistory';
import auditLogsRoutes from './routes/auditLogs';

const app = express();

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const corsOptions = process.env.CORS_ORIGIN
  ? { origin: process.env.CORS_ORIGIN.split(',') }
  : { origin: true };

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/interns', internRoutes);
app.use('/api/interns/import', importRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/Project-review', ProjectReviewRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/guide-feedback', guideFeedbackRoutes);
app.use('/api/final-evaluation', finalEvaluationRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/upload-history', uploadHistoryRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Seed Database Endpoint (browser-accessible) ──────────────────────────────
app.get('/api/seed-database', async (_req, res) => {
  try {
    const { getPrisma } = await import('./lib/prisma');
    const prisma = getPrisma();
    const { generateAllFinalEvaluations } = await import('./services/finalEvaluationService');

    // Clear existing data in correct order (respecting foreign keys)
    await prisma.finalInternshipEvaluation.deleteMany();
    await prisma.guideFeedback.deleteMany();
    await prisma.attendanceSummary.deleteMany();
    await prisma.attendanceRecord.deleteMany();
    await prisma.smartCardPunch.deleteMany();
    await prisma.finalResult.deleteMany();
    await prisma.evaluation.deleteMany();
    await prisma.projectReview.deleteMany();
    await prisma.matchLog.deleteMany();
    await prisma.intern.deleteMany();
    await prisma.guide.deleteMany();

    // ── GUIDES ──────────────────────────────────────────────────────────────
    const guides = await Promise.all([
      prisma.guide.create({
        data: {
          full_name: 'Rajesh Kumar', department: 'Manufacturing',
          expertise_domains: 'Manufacturing Engineering, Production, Lean Manufacturing, Assembly',
          required_skills: 'AutoCAD, SolidWorks, Lean Manufacturing, GD&T, Process Planning',
          preferred_intern_types: 'B.Tech, Diploma', max_capacity: 3,
        },
      }),
      prisma.guide.create({
        data: {
          full_name: 'Dr. Priya Sharma', department: 'R&D',
          expertise_domains: 'Vehicle Dynamics, R&D, Powertrain Engineering, Simulation',
          required_skills: 'MATLAB, Python, FEA, ANSYS, Vehicle Simulation',
          preferred_intern_types: 'B.Tech', max_capacity: 3,
        },
      }),
      prisma.guide.create({
        data: {
          full_name: 'Amit Patel', department: 'Quality',
          expertise_domains: 'Quality Engineering, Metrology, Statistical Quality Control, Inspection',
          required_skills: 'Six Sigma, FMEA, SPC, Minitab, Statistical Analysis',
          preferred_intern_types: 'B.Tech, Diploma', max_capacity: 3,
        },
      }),
      prisma.guide.create({
        data: {
          full_name: 'Deepak Singh', department: 'IT',
          expertise_domains: 'Information Technology, Data Analytics, Digital Manufacturing, Automation',
          required_skills: 'Python, SQL, SAP, Power BI, Java',
          preferred_intern_types: 'B.Tech, Sponsored', max_capacity: 2,
        },
      }),
      prisma.guide.create({
        data: {
          full_name: 'Sunita Rao', department: 'HR',
          expertise_domains: 'Human Resources, Training and Development, Organizational Development, Talent Management',
          required_skills: 'HR Management, Recruitment, Excel, Communication, Payroll Systems',
          preferred_intern_types: 'MBA', max_capacity: 3,
        },
      }),
      prisma.guide.create({
        data: {
          full_name: 'Vikram Mehta', department: 'Design',
          expertise_domains: 'Product Design, Body Engineering, CAD/CAM, Styling',
          required_skills: 'CATIA V5, SolidWorks, 3D Modeling, AutoCAD, GD&T',
          preferred_intern_types: 'B.Tech', max_capacity: 3,
        },
      }),
      prisma.guide.create({
        data: {
          full_name: 'Anita Joshi', department: 'Testing',
          expertise_domains: 'Vehicle Testing, NVH Testing, Chassis Engineering, Durability',
          required_skills: 'NVH Testing, MATLAB, LabVIEW, Chassis Testing, Data Acquisition',
          preferred_intern_types: 'B.Tech, Diploma', max_capacity: 3,
        },
      }),
      prisma.guide.create({
        data: {
          full_name: 'Sanjay Verma', department: 'Logistics',
          expertise_domains: 'Supply Chain, Logistics, Materials Management, Procurement',
          required_skills: 'SAP MM, Supply Chain Management, ERP, Excel, Inventory Control',
          preferred_intern_types: 'MBA, B.Tech', max_capacity: 3,
        },
      }),
    ]);

    const [rajesh, priya, _amit, deepak, sunitaRao, vikram, anita, sanjay] = guides;

    // ── INTERNS ─────────────────────────────────────────────────────────────
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
    const future = (d: number) => new Date(now.getTime() + d * 86400000);

    const internData = [
      { intern_id: 'INT001', full_name: 'Arjun Desai', phone: '+91 98201 34567', p_no: 'P10001', intern_type: 'B.Tech', college: 'VJTI Mumbai', branch: 'Mechanical Engineering', graduation_year: 2025, cgpa: 8.5, skills: 'AutoCAD, SolidWorks, Lean Manufacturing, GD&T', preferred_domain: 'Manufacturing Engineering', start_date: daysAgo(60), end_date: future(120), duration_months: 6, status: 'Ongoing', assigned_guide_id: rajesh.id },
      { intern_id: 'INT002', full_name: 'Priya Gupta', phone: '+91 97301 45678', p_no: 'P10002', intern_type: 'Diploma', college: "MAEER's MIT Polytechnic Pune", branch: 'Mechanical Engineering', graduation_year: 2025, cgpa: 7.2, skills: 'AutoCAD, Process Planning, Lean Manufacturing', preferred_domain: 'Production', start_date: daysAgo(45), end_date: future(75), duration_months: 4, status: 'Ongoing', assigned_guide_id: rajesh.id },
      { intern_id: 'INT003', full_name: 'Rohit Sharma', phone: '+91 94201 56789', p_no: 'P10003', intern_type: 'B.Tech', college: 'College of Engineering Pune', branch: 'Computer Science Engineering', graduation_year: 2025, cgpa: 9.1, skills: 'Python, SQL, Power BI, Java', preferred_domain: 'Data Analytics', start_date: daysAgo(50), end_date: future(130), duration_months: 6, status: 'Ongoing', assigned_guide_id: deepak.id },
      { intern_id: 'INT004', full_name: 'Neha Agarwal', phone: '+91 93201 67890', p_no: 'P10004', intern_type: 'B.Tech', college: 'Pune Institute of Computer Technology', branch: 'Information Technology', graduation_year: 2025, cgpa: 8.3, skills: 'Python, SAP, SQL, Power BI', preferred_domain: 'Information Technology', start_date: daysAgo(40), end_date: future(80), duration_months: 4, status: 'Ongoing', assigned_guide_id: deepak.id },
      { intern_id: 'INT005', full_name: 'Aakash Kumar', phone: '+91 91201 78901', p_no: 'P10005', intern_type: 'B.Tech', college: 'IIT Bombay', branch: 'Mechanical Engineering', graduation_year: 2025, cgpa: 8.9, skills: 'MATLAB, FEA, ANSYS, Vehicle Simulation, Python', preferred_domain: 'Vehicle Dynamics', start_date: daysAgo(55), end_date: future(125), duration_months: 6, status: 'Ongoing', assigned_guide_id: priya.id },
      { intern_id: 'INT006', full_name: 'Kavya Nair', phone: '+91 90201 89012', p_no: 'P10006', intern_type: 'MBA', college: 'Symbiosis Institute of Business Management', branch: 'Operations Management', graduation_year: 2025, cgpa: 7.8, skills: 'SAP MM, Supply Chain Management, Excel, ERP', preferred_domain: 'Supply Chain', start_date: daysAgo(30), end_date: future(60), duration_months: 3, status: 'Ongoing', assigned_guide_id: sanjay.id },
      { intern_id: 'INT007', full_name: 'Sneha Patil', phone: '+91 89201 90123', p_no: 'P10007', intern_type: 'B.Tech', college: 'Visvesvaraya National Institute of Technology', branch: 'Electronics Engineering', graduation_year: 2025, cgpa: 8.0, skills: 'MATLAB, LabVIEW, Data Acquisition, NVH Testing', preferred_domain: 'Vehicle Testing', start_date: daysAgo(35), end_date: future(85), duration_months: 4, status: 'Ongoing', assigned_guide_id: anita.id },
      { intern_id: 'INT008', full_name: 'Nikhil Joshi', phone: '+91 88201 01234', p_no: 'P10008', intern_type: 'B.Tech', college: 'MIT College of Engineering Pune', branch: 'Mechanical Engineering', graduation_year: 2025, cgpa: 8.7, skills: 'CATIA V5, SolidWorks, 3D Modeling, AutoCAD, GD&T', preferred_domain: 'Product Design', start_date: future(7), end_date: future(187), duration_months: 6, status: 'Matched', assigned_guide_id: vikram.id },
      { intern_id: 'INT009', full_name: 'Divya Singh', phone: '+91 87201 12345', p_no: 'P10009', intern_type: 'MBA', college: 'XLRI Jamshedpur', branch: 'Human Resources Management', graduation_year: 2025, cgpa: 7.5, skills: 'HR Management, Recruitment, Communication, Excel, Payroll Systems', preferred_domain: 'Human Resources', start_date: future(5), end_date: future(95), duration_months: 3, status: 'Matched', assigned_guide_id: sunitaRao.id },
      { intern_id: 'INT010', full_name: 'Meena Krishnan', phone: '+91 86201 23456', p_no: 'P10010', intern_type: 'B.Tech', college: 'NIT Karnataka', branch: 'Production Engineering', graduation_year: 2025, cgpa: 7.9, skills: 'Six Sigma, FMEA, Statistical Analysis, Minitab', preferred_domain: 'Quality Engineering', start_date: future(14), end_date: future(134), duration_months: 4, status: 'Applied' },
      { intern_id: 'INT011', full_name: 'Ananya Iyer', phone: '+91 85201 34567', p_no: 'P10011', intern_type: 'B.Tech', college: 'Cummins College of Engineering Pune', branch: 'Mechanical Engineering', graduation_year: 2025, cgpa: 8.2, skills: 'CATIA V5, AutoCAD, GD&T, SolidWorks', preferred_domain: 'Body Engineering', start_date: future(10), end_date: future(190), duration_months: 6, status: 'Applied' },
      { intern_id: 'INT012', full_name: 'Ravi Tiwari', phone: '+91 84201 45678', p_no: 'P10012', intern_type: 'B.Tech', college: 'Savitribai Phule Pune University', branch: 'Computer Science Engineering', graduation_year: 2026, cgpa: 6.8, skills: 'Python, SQL, SAP, Java', preferred_domain: 'Digital Manufacturing', start_date: future(21), end_date: future(141), duration_months: 4, status: 'Applied' },
      { intern_id: 'INT013', full_name: 'Pooja Mishra', phone: '+91 83201 56789', p_no: 'P10013', intern_type: 'Diploma', college: 'Government Polytechnic Pune', branch: 'Computer Science', graduation_year: 2025, cgpa: 7.1, skills: 'Python, Power BI, Excel, SQL', preferred_domain: 'Data Analytics', start_date: future(14), end_date: future(104), duration_months: 3, status: 'Applied' },
      { intern_id: 'INT014', full_name: 'Vikram Chauhan', phone: '+91 82201 67890', p_no: 'P10014', intern_type: 'B.Tech', college: 'Walchand College of Engineering', branch: 'Mechanical Engineering', graduation_year: 2024, cgpa: 9.0, skills: 'AutoCAD, SolidWorks, Lean Manufacturing, GD&T, Process Planning', preferred_domain: 'Manufacturing Engineering', start_date: daysAgo(180), end_date: daysAgo(0), duration_months: 6, status: 'Completed' },
      { intern_id: 'INT015', full_name: 'Sunita Bansal', phone: '+91 81201 78901', p_no: 'P10015', intern_type: 'MBA', college: 'IMS Pune', branch: 'Operations Management', graduation_year: 2024, cgpa: 7.3, skills: 'Supply Chain Management, SAP MM, ERP, Inventory Control, Excel', preferred_domain: 'Logistics', start_date: daysAgo(150), end_date: daysAgo(0), duration_months: 3, status: 'Completed' },
    ];

    const createdInterns: any[] = [];
    for (const data of internData) {
      const intern = await prisma.intern.create({ data });
      createdInterns.push(intern);
    }

    const [arjun, priyaGupta, rohit, neha, aakash, kavya, sneha, nikhil, divya, _meena, _ananya, ravi, pooja, vikramChauhan, sunitaBansal] = createdInterns;

    // ── MATCH LOGS ─────────────────────────────────────────────────────────
    await prisma.matchLog.createMany({
      data: [
        { intern_id: arjun.id, guide_id: rajesh.id, match_score: 0.89, matched_at: daysAgo(62), confirmed_at: daysAgo(61), notes: 'Strong manufacturing skill set.' },
        { intern_id: priyaGupta.id, guide_id: rajesh.id, match_score: 0.712, matched_at: daysAgo(47), confirmed_at: daysAgo(46), notes: 'Good AutoCAD proficiency.' },
        { intern_id: rohit.id, guide_id: deepak.id, match_score: 0.914, matched_at: daysAgo(52), confirmed_at: daysAgo(51), notes: 'Excellent Python and SQL skills.' },
        { intern_id: neha.id, guide_id: deepak.id, match_score: 0.82, matched_at: daysAgo(42), confirmed_at: daysAgo(41), notes: 'IT background aligns well.' },
        { intern_id: aakash.id, guide_id: priya.id, match_score: 0.936, matched_at: daysAgo(57), confirmed_at: daysAgo(56), notes: 'IIT background, strong simulation skills.' },
        { intern_id: kavya.id, guide_id: sanjay.id, match_score: 0.86, matched_at: daysAgo(32), confirmed_at: daysAgo(31), notes: 'MBA Operations with SAP MM experience.' },
        { intern_id: sneha.id, guide_id: anita.id, match_score: 0.84, matched_at: daysAgo(37), confirmed_at: daysAgo(36), notes: 'NVH testing skills match.' },
        { intern_id: nikhil.id, guide_id: vikram.id, match_score: 0.928, matched_at: daysAgo(1), notes: 'Pending confirmation.' },
        { intern_id: divya.id, guide_id: sunitaRao.id, match_score: 0.875, matched_at: daysAgo(2), notes: 'Pending confirmation.' },
        { intern_id: ravi.id, guide_id: deepak.id, match_score: 0.784, matched_at: daysAgo(10), notes: 'IT guide capacity check needed.' },
        { intern_id: pooja.id, guide_id: deepak.id, match_score: 0.702, matched_at: daysAgo(9), notes: 'IT guide capacity check needed.' },
        { intern_id: vikramChauhan.id, guide_id: rajesh.id, match_score: 0.95, matched_at: daysAgo(185), confirmed_at: daysAgo(184), Allotted_at: daysAgo(5), notes: 'Completed internship.' },
        { intern_id: sunitaBansal.id, guide_id: sanjay.id, match_score: 0.83, matched_at: daysAgo(155), confirmed_at: daysAgo(154), Allotted_at: daysAgo(5), notes: 'Completed logistics project.' },
      ],
    });

    // ── PROJECT REVIEW + EVALUATIONS + FINAL RESULTS ─────────────────────
    const projectReview = await prisma.projectReview.create({
      data: {
        title: 'Q2 2025 Intern Project Review',
        batch_name: 'Batch-2025-Q2',
        review_date: daysAgo(5),
      },
    });

    // Helper: create evaluations for a presenter (1 HR + 3 peers)
    const createEvals = async (presenterId: string, presenterName: string, scores: { hr: number[]; peers: number[][] }) => {
      // HR evaluation
      const [tech, comm, conf, und, ps, inn, doc, qa, pres, ovr] = scores.hr;
      await prisma.evaluation.create({
        data: {
          review_id: projectReview.id, presenter_id: presenterId, presenter_name: presenterName,
          evaluator_id: 'HR-001', is_hr: true,
          technical: tech, communication: comm, confidence: conf, understanding: und,
          problem_solving: ps, innovation: inn, documentation: doc, qa_handling: qa,
          presentation: pres, overall: ovr, total_marks: tech + comm + conf + und + ps + inn + doc + qa + pres + ovr,
        },
      });
      // Peer evaluations
      for (let p = 0; p < scores.peers.length; p++) {
        const [t, c, co, u, psl, i, d, q, pr, o] = scores.peers[p];
        await prisma.evaluation.create({
          data: {
            review_id: projectReview.id, presenter_id: presenterId, presenter_name: presenterName,
            evaluator_id: `PEER-${p + 1}`, is_hr: false,
            technical: t, communication: c, confidence: co, understanding: u,
            problem_solving: psl, innovation: i, documentation: d, qa_handling: q,
            presentation: pr, overall: o, total_marks: t + c + co + u + psl + i + d + q + pr + o,
          },
        });
      }
    };

    // Evaluations for 7 ongoing interns + 2 completed interns
    await createEvals(arjun.intern_id, 'Arjun Desai', {
      hr: [9, 8, 8, 9, 8, 7, 8, 8, 9, 8],   // total 82
      peers: [[8,7,8,8,7,7,7,8,8,7], [9,8,7,8,8,8,8,7,8,8], [8,8,8,9,7,7,8,8,9,8]],
    });
    await createEvals(priyaGupta.intern_id, 'Priya Gupta', {
      hr: [7, 7, 7, 7, 6, 6, 7, 7, 7, 7],    // total 68
      peers: [[7,6,7,6,6,6,7,6,7,6], [7,7,6,7,7,6,6,7,7,7], [6,7,7,7,6,7,7,6,6,7]],
    });
    await createEvals(rohit.intern_id, 'Rohit Sharma', {
      hr: [10, 9, 9, 10, 9, 9, 9, 9, 10, 9],  // total 93
      peers: [[9,9,8,9,9,8,9,8,9,9], [10,9,9,9,8,9,9,9,10,9], [9,8,9,9,9,9,8,9,9,9]],
    });
    await createEvals(neha.intern_id, 'Neha Agarwal', {
      hr: [8, 8, 7, 8, 7, 7, 8, 7, 8, 8],    // total 76
      peers: [[7,7,7,8,7,7,7,7,8,7], [8,8,7,7,7,8,7,7,7,8], [8,7,8,8,7,7,8,7,8,7]],
    });
    await createEvals(aakash.intern_id, 'Aakash Kumar', {
      hr: [10, 9, 9, 10, 10, 9, 9, 9, 10, 10], // total 95
      peers: [[9,9,9,10,9,9,9,9,9,9], [10,9,9,9,10,10,9,9,10,9], [9,9,10,10,9,9,9,10,9,9]],
    });
    await createEvals(kavya.intern_id, 'Kavya Nair', {
      hr: [7, 8, 7, 7, 7, 6, 7, 7, 8, 7],    // total 71
      peers: [[7,7,7,7,6,6,7,7,7,7], [7,7,7,6,7,7,6,7,7,7], [7,8,7,7,7,6,7,6,7,7]],
    });
    await createEvals(sneha.intern_id, 'Sneha Patil', {
      hr: [8, 8, 8, 8, 8, 7, 8, 8, 8, 8],    // total 79
      peers: [[8,7,7,8,7,7,8,7,8,7], [8,8,8,7,8,7,7,8,8,8], [7,8,8,8,7,8,8,7,8,7]],
    });
    await createEvals(vikramChauhan.intern_id, 'Vikram Chauhan', {
      hr: [9, 9, 9, 9, 9, 8, 9, 9, 9, 9],    // total 89
      peers: [[9,8,8,9,8,8,8,9,9,8], [9,9,8,8,9,8,9,8,9,9], [8,9,9,9,8,8,9,8,8,9]],
    });
    await createEvals(sunitaBansal.intern_id, 'Sunita Bansal', {
      hr: [7, 7, 7, 7, 6, 6, 7, 7, 7, 7],    // total 68
      peers: [[7,6,7,7,6,6,6,7,7,6], [7,7,6,7,7,6,7,6,7,7], [6,7,7,6,7,7,6,7,6,7]],
    });

    // Final Results (computed from evaluations)
    const presenters = [
      { id: arjun.intern_id, name: 'Arjun Desai', hr: 82, peerAvg: 78, penalty: 0 },
      { id: priyaGupta.intern_id, name: 'Priya Gupta', hr: 68, peerAvg: 65.3, penalty: 0 },
      { id: rohit.intern_id, name: 'Rohit Sharma', hr: 93, peerAvg: 89.3, penalty: 0 },
      { id: neha.intern_id, name: 'Neha Agarwal', hr: 76, peerAvg: 73.7, penalty: 0 },
      { id: aakash.intern_id, name: 'Aakash Kumar', hr: 95, peerAvg: 92.3, penalty: 0 },
      { id: kavya.intern_id, name: 'Kavya Nair', hr: 71, peerAvg: 68.3, penalty: 0 },
      { id: sneha.intern_id, name: 'Sneha Patil', hr: 79, peerAvg: 76.7, penalty: 0 },
      { id: vikramChauhan.intern_id, name: 'Vikram Chauhan', hr: 89, peerAvg: 85.7, penalty: 0 },
      { id: sunitaBansal.intern_id, name: 'Sunita Bansal', hr: 68, peerAvg: 65.7, penalty: 0 },
    ];

    for (const p of presenters) {
      const presScore = (p.hr * 0.6) + (p.peerAvg * 0.4);
      await prisma.finalResult.create({
        data: {
          review_id: projectReview.id,
          presenter_id: p.id,
          presenter_name: p.name,
          hr_score: p.hr,
          peer_average: p.peerAvg,
          presentation_score: presScore,
          total_penalty: p.penalty,
          final_score: presScore - p.penalty,
        },
      });
    }

    // ── DAILY ATTENDANCE RECORDS + SUMMARIES ────────────────────────────────
    const activeInterns = [arjun, priyaGupta, rohit, neha, aakash, kavya, sneha, vikramChauhan, sunitaBansal];
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    for (const intern of activeInterns) {
      // Generate 20 daily attendance records over the past 25 working days
      const totalDays = 25;
      const presentCount = intern.intern_id === 'INT003' ? 24 : // Rohit: excellent
                           intern.intern_id === 'INT005' ? 23 : // Aakash: very good
                           intern.intern_id === 'INT001' ? 22 : // Arjun: good
                           intern.intern_id === 'INT007' ? 21 : // Sneha: good
                           intern.intern_id === 'INT014' ? 24 : // Vikram C: excellent
                           intern.intern_id === 'INT004' ? 20 : // Neha: decent
                           intern.intern_id === 'INT006' ? 19 : // Kavya: decent
                           intern.intern_id === 'INT002' ? 18 : // Priya: fair
                           intern.intern_id === 'INT015' ? 20 : 20; // Sunita: decent

      for (let d = 0; d < presentCount; d++) {
        const attDate = daysAgo(totalDays - d);
        const submittedAt = new Date(attDate.getTime() + 9 * 3600000); // 9 AM
        await prisma.attendanceRecord.create({
          data: {
            intern_id: intern.intern_id,
            attendance_date: attDate,
            submitted_at: submittedAt,
            status: 'PRESENT',
          },
        });
      }

      // Attendance summary
      const attPct = (presentCount / totalDays) * 100;
      const attScore = attPct >= 95 ? 100 : attPct >= 90 ? 90 : attPct >= 80 ? 80 : attPct >= 70 ? 70 : 60;
      await prisma.attendanceSummary.create({
        data: {
          intern_id: intern.intern_id,
          month: currentMonth,
          year: currentYear,
          batch_name: 'Batch-2025-Q2',
          total_working_days: totalDays,
          present_days: presentCount,
          genuine_days: presentCount,
          attendance_percentage: attPct,
          sincerity_percentage: attPct,
          attendance_score: attScore,
          flagged: attPct < 75,
          flag_details: attPct < 75 ? 'Low attendance' : null,
        },
      });
    }

    // ── SMART CARD PUNCHES ──────────────────────────────────────────────────
    for (const intern of activeInterns) {
      const punchDays = intern.intern_id === 'INT003' ? 22 :
                        intern.intern_id === 'INT005' ? 21 :
                        intern.intern_id === 'INT001' ? 20 :
                        intern.intern_id === 'INT014' ? 22 : 18;

      for (let d = 0; d < punchDays; d++) {
        const punchDate = daysAgo(25 - d);
        const inHour = 8 + Math.floor(Math.random() * 2);  // 8-9 AM
        const inMin = Math.floor(Math.random() * 60);
        const outHour = 17 + Math.floor(Math.random() * 2); // 5-6 PM
        const outMin = Math.floor(Math.random() * 60);
        await prisma.smartCardPunch.create({
          data: {
            intern_id: intern.intern_id,
            p_no: intern.p_no || intern.intern_id,
            punch_date: punchDate,
            in_time: `${String(inHour).padStart(2, '0')}:${String(inMin).padStart(2, '0')}`,
            out_time: `${String(outHour).padStart(2, '0')}:${String(outMin).padStart(2, '0')}`,
          },
        });
      }
    }

    // ── GUIDE FEEDBACK ──────────────────────────────────────────────────────
    const guideFeedbackData = [
      { intern_id: arjun.intern_id, guide_name: 'Rajesh Kumar',       scores: [8,8,9,8,8, 8,8,7,8,8,9,8,8,8,8,8,8] },
      { intern_id: priyaGupta.intern_id, guide_name: 'Rajesh Kumar',  scores: [7,6,7,6,7, 7,6,6,7,7,7,6,7,6,7,6,7] },
      { intern_id: rohit.intern_id, guide_name: 'Deepak Singh',       scores: [9,9,9,9,9, 9,9,9,9,9,10,9,9,9,9,9,9] },
      { intern_id: neha.intern_id, guide_name: 'Deepak Singh',        scores: [7,7,8,7,7, 8,7,7,7,8,8,7,7,7,7,7,8] },
      { intern_id: aakash.intern_id, guide_name: 'Dr. Priya Sharma',  scores: [10,9,9,9,9, 10,9,9,9,9,10,9,9,9,10,9,9] },
      { intern_id: kavya.intern_id, guide_name: 'Sanjay Verma',       scores: [7,7,7,7,7, 7,6,6,7,7,7,7,7,7,7,7,7] },
      { intern_id: sneha.intern_id, guide_name: 'Anita Joshi',        scores: [8,8,8,7,8, 8,7,7,8,8,8,8,8,7,8,7,8] },
      { intern_id: vikramChauhan.intern_id, guide_name: 'Rajesh Kumar', scores: [9,9,9,8,9, 9,8,8,9,9,9,9,9,8,9,8,9] },
      { intern_id: sunitaBansal.intern_id, guide_name: 'Sanjay Verma', scores: [7,7,7,6,7, 7,6,6,7,7,7,7,7,6,7,6,7] },
    ];

    for (const fb of guideFeedbackData) {
      const s = fb.scores;
      const totalMarks = s.reduce((a, b) => a + b, 0);
      const maxMarks = s.length * 10;
      const guideScore = (totalMarks / maxMarks) * 100;
      await prisma.guideFeedback.create({
        data: {
          intern_id: fb.intern_id,
          guide_name: fb.guide_name,
          discipline: s[0], learning_ability: s[1], teamwork: s[2], communication: s[3], task_completion: s[4],
          quality_of_work: s[5], problem_solving: s[6], initiative_innovation: s[7], learning_adaptability: s[8],
          attendance_punctuality: s[9], professionalism_ethics: s[10], respect_authority: s[11], accountability: s[12],
          conflict_resolution: s[13], empathy: s[14], leadership_potential: s[15], conflict_handling: s[16],
          total_marks: totalMarks,
          guide_score: guideScore,
        },
      });
    }

    // ── GENERATE FINAL EVALUATIONS ──────────────────────────────────────────
    let finalEvalCount = 0;
    try {
      const results = await generateAllFinalEvaluations();
      finalEvalCount = results.length;
    } catch (e) {
      console.warn('[Seed] Final evaluation generation skipped:', e);
    }

    res.json({
      success: true,
      message: '🎉 Database seeded successfully with all modules!',
      data: {
        guides: guides.length,
        interns: createdInterns.length,
        matchLogs: 13,
        projectReviews: 1,
        evaluations: 9 * 4, // 9 presenters × (1 HR + 3 peers)
        finalResults: presenters.length,
        attendanceRecords: '~190 daily records',
        attendanceSummaries: activeInterns.length,
        smartCardPunches: '~180 punch records',
        guideFeedbacks: guideFeedbackData.length,
        finalEvaluations: finalEvalCount,
      },
    });
  } catch (error: any) {
    console.error('[Seed] Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to seed database' });
  }
});

const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

export default app;
