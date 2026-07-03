import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InternsList from './pages/InternsList';
import AddIntern from './pages/AddIntern';
import InternDetail from './pages/InternDetail';
import GuidesList from './pages/GuidesList';
import AddEditGuide from './pages/AddEditGuide';
import GuideDetail from './pages/GuideDetail';
import Waitlist from './pages/Waitlist';
import ImportResults from './pages/ImportResults';
import AllottedBreakdown from './pages/AllottedBreakdown';
import WaitlistedBreakdown from './pages/WaitlistedBreakdown';
import YetToJoinBreakdown from './pages/YetToJoinBreakdown';
import ProjectReviewDashboard from './pages/ProjectReviewDashboard';
import CreatePresentation from './pages/CreatePresentation';
import EvaluationForm from './pages/EvaluationForm';
import Leaderboard from './pages/Leaderboard';
import ReviewResults from './pages/ReviewResults';
import PresentationsList from './pages/PresentationList';
import SavedEvaluations from './pages/SavedEvaluations';
import AttendanceEvaluation from './pages/AttendanceEvaluation';
import GuideFeedbackPage from './pages/GuideFeedback';
import FinalInternshipEvaluation from './pages/FinalInternshipEvaluation';
import SmartCardAttendance from './pages/SmartCardAttendance';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/interns" element={<InternsList />} />
          <Route path="/interns/new" element={<AddIntern />} />
          <Route path="/interns/:id/edit" element={<AddIntern />} />
          <Route path="/interns/:id" element={<InternDetail />} />
          <Route path="/guides" element={<GuidesList />} />
          <Route path="/guides/new" element={<AddEditGuide />} />
          <Route path="/guides/:id" element={<GuideDetail />} />
          <Route path="/guides/:id/edit" element={<AddEditGuide />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="/interns/import-results" element={<ImportResults />} />
          <Route path="/allotted-breakdown" element={<AllottedBreakdown />} />
          <Route path="/waitlisted-breakdown" element={<WaitlistedBreakdown />} />
          <Route path="/yet-to-join-breakdown" element={<YetToJoinBreakdown />} />
          
          {/* Project Review Routes */}
          <Route path="/project-review" element={<ProjectReviewDashboard />} />
          <Route path="/project-review/create" element={<CreatePresentation />} />
          <Route path="/project-review/evaluation" element={<EvaluationForm />} />
          <Route path="/project-review/leaderboard" element={<Leaderboard />} />
          <Route path="/project-review/saved" element={<SavedEvaluations />} />
          <Route path="/project-review/results" element={<ReviewResults />} />
          <Route path="/project-review/presentations" element={<PresentationsList />} />
          
          {/* Attendance, Guide Feedback & Final Evaluation Routes */}
          <Route path="/smart-card-attendance" element={<SmartCardAttendance />} />
          <Route path="/attendance-evaluation" element={<AttendanceEvaluation />} />
          <Route path="/guide-feedback" element={<GuideFeedbackPage />} />
          <Route path="/final-evaluation" element={<FinalInternshipEvaluation />} />

          {/* Dynamic routes with parameters */}
          <Route path="/project-review/evaluate/:reviewId/:internId" element={<EvaluationForm />} />
          <Route path="/project-review/leaderboard/:reviewId" element={<Leaderboard />} />
          <Route path="/project-review/results/:reviewId/:internId" element={<ReviewResults />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
