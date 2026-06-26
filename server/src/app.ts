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

app.get('/health', (_req, res) => res.json({ ok: true }));

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
