import { Fragment, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIntern, getMatches, confirmMatch, completedIntern, updateInternProject } from '../api';
import { Intern, MatchResult } from '../types';
import StatusBadge from '../components/StatusBadge';

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 0.7 ? 'bg-green-500' : score >= 0.4 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: pct(score) }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-10 text-right">{pct(score)}</span>
    </div>
  );
}

export default function InternDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [intern, setIntern] = useState<Intern | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmNotes, setConfirmNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [waMsg, setWaMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [editingProject, setEditingProject] = useState(false);
  const [ProjectTitle, setProjectTitle] = useState('');
  const [ProjectDetails, setProjectDetails] = useState('');
  const [savingProject, setSavingProject] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function load() {
    if (!id) return;
    try {
      const [i, m] = await Promise.all([getIntern(id), getMatches(id)]);
      setIntern(i);
      setMatches(m.matches);
      setSelectedGuideId(i.assigned_guide_id ?? m.matches[0]?.guide_id ?? '');
      setProjectTitle(i.Project_title ?? '');
      setProjectDetails(i.Project_details ?? '');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProject() {
    if (!intern?.id) return;
    setSavingProject(true);
    try {
      const updated = await updateInternProject(intern.id, { Project_title: ProjectTitle, Project_details: ProjectDetails });
      setIntern(updated);
      setEditingProject(false);
      showToast('Project details saved.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save Project details');
    } finally {
      setSavingProject(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function generateWhatsApp() {
    if (!intern) return;
    const guide = matches.find((m) => m.guide_id === (intern.assigned_guide_id ?? selectedGuideId))?.guide
      ?? intern.assigned_guide;
    const guideName = guide?.full_name ?? '[Guide Name]';
    const startDate = new Date(intern.start_date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    setWaMsg(
      `Hi ${guideName},\n\n${intern.full_name} (${intern.intern_type}, ${intern.college}) has been assigned to you as an intern starting ${startDate} for ${intern.duration_months} month${intern.duration_months > 1 ? 's' : ''}.\n\nStream: ${intern.branch}\nSkills: ${intern.skills.join(', ')}\n\nPlease acknowledge this assignment at your earliest convenience.\n\nRegards,\nHR Department — Tata Motors Pimpri Plant`
    );
  }

  async function handleConfirm() {
    if (!intern?.id || !selectedGuideId) return;
    setActing(true);
    try {
      const updated = await confirmMatch(intern.id, selectedGuideId, confirmNotes);
      setIntern(updated);
      showToast('Match confirmed. Intern is now allotted.');
      load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error confirming match');
    } finally {
      setActing(false);
    }
  }

  async function handleAllotted() {
    if (!intern?.id) return;
    if (!window.confirm('Mark this internship as Completed? This will free the guide slot.')) return;
    setActing(true);
    try {
      const result = await completedIntern(intern.id);
      setIntern(result.intern);
      if (result.newly_matched_from_waitlist.length > 0) {
        showToast(`Internship Completed. ${result.newly_matched_from_waitlist.length} waitlisted intern(s) now matched!`);
      } else {
        showToast('Internship marked Completed.');
      }
      load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error completing');
    } finally {
      setActing(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(waMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-tata-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!intern) return <div className="p-8 text-red-600">Intern not found.</div>;

  const currentMatchLog = intern.match_logs?.[0];
  const assignedMatch = matches.find((m) => m.guide_id === intern.assigned_guide_id);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-tata-navy text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* Back + Header */}
      <div>
        <button onClick={() => navigate('/interns')} className="text-sm text-gray-500 hover:text-gray-800 mb-2">
          ← Interns
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-tata-navy">{intern.full_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{intern.college} · {intern.branch}</p>
          </div>
          <StatusBadge status={intern.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Profile</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Type</dt>
                <dd className="font-medium">{intern.intern_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">CGPA</dt>
                <dd className="font-medium">{Number(intern.cgpa).toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Graduation</dt>
                <dd className="font-medium">{intern.graduation_year}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Start Date</dt>
                <dd className="font-medium">{new Date(intern.start_date).toLocaleDateString('en-IN')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Duration</dt>
                <dd className="font-medium">{intern.duration_months} months</dd>
              </div>
              <div className="flex justify-between">
  <dt className="text-gray-500">End date</dt>
  <dd className="font-medium">
    {new Date(intern.end_date).toLocaleDateString('en-IN')}
  </dd>
</div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium">{intern.phone}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Domain</dt>
                <dd className="font-medium text-right">{intern.preferred_domain}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {intern.skills.map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-tata-light text-tata-navy font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Project */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Project</h2>
              {!editingProject && (
                <button
                  className="text-xs text-tata-blue hover:underline"
                  onClick={() => setEditingProject(true)}
                >
                  {intern.Project_title ? 'Edit' : '+ Add'}
                </button>
              )}
            </div>

            {editingProject ? (
              <div className="space-y-2">
                <input
                  className="input text-sm"
                  placeholder="Project Title"
                  value={ProjectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                />
                <textarea
                  className="input text-sm"
                  rows={3}
                  placeholder="Project Details"
                  value={ProjectDetails}
                  onChange={(e) => setProjectDetails(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    className="btn-primary text-xs py-1 px-3"
                    onClick={handleSaveProject}
                    disabled={savingProject}
                  >
                    {savingProject ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    className="btn-secondary text-xs py-1 px-3"
                    onClick={() => {
                      setEditingProject(false);
                      setProjectTitle(intern.Project_title ?? '');
                      setProjectDetails(intern.Project_details ?? '');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : intern.Project_title ? (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-tata-navy">{intern.Project_title}</p>
                {intern.Project_details && (
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{intern.Project_details}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No Project assigned yet.</p>
            )}
          </div>

          {/* Status timeline */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">History</h2>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-0.5" />
                  <div className="w-px flex-1 bg-gray-200" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">Applied</p>
                  <p className="text-xs text-gray-400">{new Date(intern.created_at).toLocaleDateString('en-IN')}</p>
                </div>
              </li>
              {intern.match_logs?.map((log) => (
                <Fragment key={log.id}>
                  <li className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 mt-0.5" />
                      {(log.confirmed_at || log.allotted_at) && <div className="w-px flex-1 bg-gray-200" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        Matched → {log.guide?.full_name} (score: {(Number(log.match_score) * 100).toFixed(0)}%)
                      </p>
                      <p className="text-xs text-gray-400">{new Date(log.matched_at).toLocaleDateString('en-IN')}</p>
                      {log.notes && <p className="text-xs text-gray-500 italic mt-0.5">{log.notes}</p>}
                    </div>
                  </li>
                  {log.confirmed_at && (
                    <li className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-0.5" />
                        {log.allotted_at && <div className="w-px flex-1 bg-gray-200" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">Allotted</p>
                        <p className="text-xs text-gray-400">{new Date(log.confirmed_at).toLocaleDateString('en-IN')}</p>
                      </div>
                    </li>
                  )}
                  {log.allotted_at && (
                    <li className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-400 mt-0.5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">Completed</p>
                        <p className="text-xs text-gray-400">{new Date(log.allotted_at).toLocaleDateString('en-IN')}</p>
                      </div>
                    </li>
                  )}
                </Fragment>
              ))}
            </ol>
          </div>
        </div>

        {/* Right: Match panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Current match score breakdown */}
          {assignedMatch && (
            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-gray-700">
                <div className="space-y-2">
  <ScoreBar
    label="Branch Match"
    score={assignedMatch.branch_score / 100}
  />

  <ScoreBar
    label="CGPA Score"
    score={assignedMatch.cgpa_score / 10}
  />

  <ScoreBar
    label="Intern Type"
    score={assignedMatch.intern_type_score / 100}
  />
</div>
                Current Match — {assignedMatch.guide.full_name}
                <span className="ml-2 text-tata-blue font-bold">
                  {pct(assignedMatch.total_score)}
                </span>
              </h2>

              {/*<div className="space-y-2">
                <ScoreBar label="Skill Overlap" score={assignedMatch.skill_score} />
                <ScoreBar label="Domain Match" score={assignedMatch.domain_score} />
                <ScoreBar label="CGPA Factor" score={assignedMatch.cgpa_score} />
              </div>*/}

              {/* Human-readable skill detail */} 
            </div>
          )}

          {/* Top 5 guide matches */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-700">Top Guide Matches</h2>
            {matches.length === 0 ? (
              <p className="text-sm text-gray-400">No guides available.</p>
            ) : (
              <div className="space-y-3">
                {matches.map((m, i) => (
                  <div
                    key={m.guide_id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedGuideId === m.guide_id
                        ? 'border-tata-blue bg-tata-light'
                        : 'border-gray-100 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedGuideId(m.guide_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500 w-5">#{i + 1}</span>
                        <div>
                          <p className="text-sm font-semibold text-tata-navy">{m.guide.full_name}</p>
                          <p className="text-xs text-gray-500">{m.guide.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-tata-blue">{pct(m.total_score)}</p>
                        <p className="text-xs text-gray-400">
                          {m.guide.current_intern_count}/{m.guide.max_capacity} slots
                          {m.guide.is_at_capacity && (
                            <span className="ml-1 text-red-500 font-medium">FULL</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HR Actions */}
          {intern.status === 'Matched' && (
            <div className="card p-5 space-y-3">
              <h2 className="font-semibold text-gray-700">Confirm Placement</h2>
              <p className="text-sm text-gray-500">
                Select a guide above and add an optional note before confirming.
              </p>
              <textarea
                className="input"
                rows={2}
                placeholder="Optional note for this placement…"
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  className="btn-primary"
                  onClick={handleConfirm}
                  disabled={acting || !selectedGuideId}
                >
                  {acting ? 'Confirming…' : `Confirm with ${matches.find((m) => m.guide_id === selectedGuideId)?.guide.full_name ?? 'Selected Guide'}`}
                </button>
              </div>
            </div>
          )}

          {intern.status === 'Completed' && (
            <div className="card p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Assigned to {intern.assigned_guide?.full_name}
                </p>
                <p className="text-xs text-gray-500">
                  Started {new Date(intern.start_date).toLocaleDateString('en-IN')} ·{' '}
                  {intern.duration_months} months
                </p>
              </div>
              <button
                className="btn-danger"
                onClick={handleAllotted}
                disabled={acting}
              >
                {acting ? 'Processing…' : 'Mark Allotted'}
              </button>
            </div>
          )}

          {/* WhatsApp message generator */}
          {(intern.status === 'Matched' || intern.status === 'Allotted') && (
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-700">WhatsApp Message Generator</h2>
                <button className="btn-secondary text-xs" onClick={generateWhatsApp}>
                  Generate
                </button>
              </div>
              {waMsg && (
                <div className="bg-[#ECF8E8] border border-green-200 rounded-xl p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {waMsg}
                  </pre>
                  <button
                    onClick={handleCopy}
                    className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    {copied ? '✓ Copied!' : 'Copy Message'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
