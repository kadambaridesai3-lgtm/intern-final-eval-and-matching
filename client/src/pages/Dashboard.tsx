import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  onClick?: () => void;
}

function StatCard({ label, value, sub, color, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card p-5 h-full transition duration-200 border border-slate-100 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-100' : ''
      }`}
    >
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-black mt-2 tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 font-medium mt-1.5">{sub}</p>}
    </div>
  );
}

function MiniBarChart({
  title,
  data,
  labelKey,
  valueKey,
  color,
}: {
  title: string;
  data: any[];
  labelKey: string;
  valueKey: string;
  color: string;
}) {
  const maxVal = Math.max(...data.map(d => Number(d[valueKey])), 1);

  return (
    <div className="card p-5 space-y-4 border border-slate-100 shadow-sm">
      <h3 className="font-extrabold text-slate-800 text-sm tracking-tight border-b border-slate-100 pb-2">{title}</h3>
      <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
        {data.map((item, idx) => {
          const label = item[labelKey] || 'Unknown';
          const val = Number(item[valueKey]) || 0;
          const pct = (val / maxVal) * 100;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span className="truncate max-w-[200px]" title={label}>{label}</span>
                <span className="font-bold text-slate-800">{val}</span>
              </div>
              <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {data.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No records found</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return <div className="p-8 text-red-600 font-bold">Failed to load dashboard.</div>;

  // Compute total in status tracker
  const totalWithCounts =
    (data.total_completed || 0) +
    (data.waitlisted || 0) +
    (data.pending_confirmation || 0) +
    (data.total_allotted || 0) +
    (data.left_count || 0) +
    (data.yet_to_join_count || 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-tata-navy tracking-tight">🏢 Corporate HR Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Tata Motors Pimpri Plant · Internship Management & Matching</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/final-evaluation')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow shadow-indigo-100"
          >
            🏆 View Final Evaluations
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {data.long_waitlisted_count > 0 && (
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm animate-pulse">
          <span className="text-amber-600 text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-800">
              {data.long_waitlisted_count} Intern{data.long_waitlisted_count > 1 ? 's' : ''} Waitlisted for &gt; 7 Days
            </p>
            <ul className="mt-1.5 space-y-1">
              {data.long_waitlisted.map((i: any) => (
                <li key={i.id} className="text-xs text-amber-700 font-medium">
                  {i.full_name} ({i.intern_type}, {i.branch}) — since{' '}
                  {new Date(i.waiting_since).toLocaleDateString('en-IN')}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/waitlist')}
              className="mt-2 text-xs font-bold text-amber-800 underline hover:no-underline"
            >
              Manage Waitlist →
            </button>
          </div>
        </div>
      )}

      {/* Performers Banners */}
      {(data.top_performer || data.bottom_performer) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.top_performer && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">🥇 Top Performer</span>
                <h4 className="text-lg font-black text-emerald-950 mt-1">{data.top_performer.name}</h4>
                <p className="text-xs text-emerald-700 font-medium">Leading with outstanding evaluation results</p>
              </div>
              <p className="text-3xl font-black text-emerald-600">{data.top_performer.score.toFixed(1)}%</p>
            </div>
          )}
          {data.bottom_performer && (
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 bg-rose-100 px-2 py-0.5 rounded">⚠️ Needs Attention</span>
                <h4 className="text-lg font-black text-rose-950 mt-1">{data.bottom_performer.name}</h4>
                <p className="text-xs text-rose-700 font-medium">Lowest evaluation score requiring follow-up</p>
              </div>
              <p className="text-3xl font-black text-rose-600">{data.bottom_performer.score.toFixed(1)}%</p>
            </div>
          )}
        </div>
      )}

      {/* Intern Status Stats Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Intern Status & Allocation</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="Total Interns"
            value={data.total_interns || 0}
            sub="All active and pending"
            color="text-slate-800"
            onClick={() => navigate('/interns')}
          />
          <StatCard
            label="Project Interns"
            value={data.project_interns_count || 0}
            sub="Technical projects"
            color="text-indigo-600"
            onClick={() => navigate('/interns?project_required=Yes')}
          />
          <StatCard
            label="Support Interns"
            value={data.support_interns_count || 0}
            sub="Operations / Training"
            color="text-teal-600"
            onClick={() => navigate('/interns?project_required=No')}
          />
          <StatCard
            label="Waitlisted"
            value={data.waitlisted || 0}
            sub="Awaiting guides"
            color="text-orange-500"
            onClick={() => navigate('/waitlist')}
          />
          <StatCard
            label="Pending Matches"
            value={data.pending_confirmation || 0}
            sub="Awaiting HR approval"
            color="text-amber-500"
            onClick={() => navigate('/interns?status=Matched')}
          />
        </div>
      </div>

      {/* Performance Score Metrics Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">Evaluation Averages & Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard
            label="Avg Attendance"
            value={data.attendance_avg ? `${data.attendance_avg.toFixed(1)}%` : '—'}
            sub="Raw daily submission"
            color="text-blue-600"
            onClick={() => navigate('/attendance')}
          />
          <StatCard
            label="Avg Guide Score"
            value={data.guide_avg ? `${data.guide_avg.toFixed(1)}%` : '—'}
            sub="Dimension Q5-Q19"
            color="text-emerald-600"
            onClick={() => navigate('/guide-feedback')}
          />
          <StatCard
            label="Avg Project Score"
            value={data.project_avg ? `${data.project_avg.toFixed(1)}/100` : '—'}
            sub="Presentation reviews"
            color="text-purple-600"
            onClick={() => navigate('/project-review/results')}
          />
          <StatCard
            label="Final Score Avg"
            value={data.final_avg ? `${data.final_avg.toFixed(1)}%` : '—'}
            sub="Weighted evaluation"
            color="text-pink-600"
            onClick={() => navigate('/final-evaluation')}
          />
          <StatCard
            label="Completed Reviews"
            value={data.completed_reviews || 0}
            sub="Scores locked"
            color="text-green-600"
          />
          <StatCard
            label="Pending Reviews"
            value={data.pending_reviews || 0}
            sub="Action required"
            color="text-red-500"
          />
        </div>
      </div>

      {/* Charts Grid */}
      {data.charts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MiniBarChart
            title="Department-wise Distribution"
            data={data.charts.departmentWise || []}
            labelKey="department"
            valueKey="count"
            color="bg-gradient-to-r from-blue-500 to-indigo-500"
          />
          <MiniBarChart
            title="College-wise Distribution"
            data={data.charts.collegeWise || []}
            labelKey="college"
            valueKey="count"
            color="bg-gradient-to-r from-teal-500 to-emerald-500"
          />
          <MiniBarChart
            title="Monthly Joinings"
            data={data.charts.monthlyJoinings || []}
            labelKey="month"
            valueKey="count"
            color="bg-gradient-to-r from-purple-500 to-pink-500"
          />
          <MiniBarChart
            title="Guide Allocation Load"
            data={data.charts.guideWise || []}
            labelKey="guide_name"
            valueKey="count"
            color="bg-gradient-to-r from-amber-500 to-orange-500"
          />
        </div>
      )}

      {/* Quick actions & Allocation Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card p-6 space-y-4 border border-slate-100 shadow-sm">
          <h3 className="font-extrabold text-slate-800 text-sm">Quick Actions</h3>
          <div className="flex flex-wrap gap-2.5">
            <button onClick={() => navigate('/interns/new')} className="btn-primary">
              ➕ Add New Intern
            </button>
            <button onClick={() => navigate('/guides/new')} className="btn-secondary">
              ➕ Add New Guide
            </button>
            <button onClick={() => navigate('/attendance')} className="btn-secondary">
              📋 Add Attendance
            </button>
            <button onClick={() => navigate('/guide-feedback')} className="btn-secondary">
              👨‍🏫 Add Guide Feedback
            </button>
            <button onClick={() => navigate('/project-review/results')} className="btn-secondary">
              📊 Add Project Score
            </button>
          </div>
        </div>

        <div className="card p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm">Allocation Overview</h3>
          <div className="space-y-3">
            {[
              { label: 'Allotted', value: data.total_allotted || 0, color: 'bg-green-500', total: totalWithCounts },
              { label: 'Pending Confirmation', value: data.pending_confirmation || 0, color: 'bg-yellow-400', total: totalWithCounts },
              { label: 'Waitlisted', value: data.waitlisted || 0, color: 'bg-orange-400', total: totalWithCounts },
              { label: 'Completed', value: data.total_completed || 0, color: 'bg-purple-500', total: totalWithCounts },
              { label: 'Left / Removed', value: data.left_count || 0, color: 'bg-pink-500', total: totalWithCounts },
            ].map(({ label, value, color, total }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 font-semibold w-36 truncate">{label}</span>
                <div className="flex-1 h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-800 w-6 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
