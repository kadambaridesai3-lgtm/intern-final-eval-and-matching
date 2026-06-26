import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInterns, getGuides, getMatches, runWaitlistMatching } from '../api';
import { Intern, Guide, MatchResult } from '../types';

interface WaitlistRow {
  intern: Intern;
  bestMatch: MatchResult | null;
  waitingSince: Date | null;
  waitingDays: number;
  canMatch: boolean;
}

export default function Waitlist() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      const [waitlisted, allGuides] = await Promise.all([
        getInterns({ status: 'Waitlisted' }),
        getGuides(),
      ]);
      setGuides(allGuides);

      const matchResults = await Promise.all(
        waitlisted.map((i) => getMatches(i.id).catch(() => null)),
      );

      const now = new Date();
      const built: WaitlistRow[] = waitlisted.map((intern, idx) => {
        const matchData = matchResults[idx];
        const bestMatch = matchData?.matches?.[0] ?? null;
        const log = intern.match_logs?.[0];
        const waitingSince = log ? new Date(log.matched_at) : null;
        const waitingDays = waitingSince
          ? Math.floor((now.getTime() - waitingSince.getTime()) / 86400000)
          : 0;
        const canMatch = bestMatch ? !bestMatch.guide.is_at_capacity : false;

        return { intern, bestMatch, waitingSince, waitingDays, canMatch };
      });

      built.sort((a, b) => (b.waitingDays - a.waitingDays));
      setRows(built);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRunMatching() {
    setRunning(true);
    try {
      const result = await runWaitlistMatching();
      if (result.newly_matched > 0) {
        showToast(`${result.newly_matched} intern(s) newly matched! Refreshing…`);
      } else {
        showToast('No new matches available — guides still at capacity.');
      }
      load();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error running matching');
    } finally {
      setRunning(false);
    }
  }

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-tata-navy text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tata-navy">Waitlist</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {rows.length} intern{rows.length !== 1 ? 's' : ''} waiting for placement
          </p>
        </div>
        <button onClick={handleRunMatching} className="btn-primary" disabled={running}>
          {running ? 'Running…' : '⟳ Re-run Matching'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-7 h-7 border-4 border-tata-blue border-t-transparent rounded-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          No waitlisted interns. All interns have been placed!
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(({ intern, bestMatch, waitingDays, canMatch }) => (
            <div
              key={intern.id}
              className={`card p-5 border-l-4 ${
                canMatch
                  ? 'border-l-green-500 bg-green-50'
                  : waitingDays >= 7
                  ? 'border-l-red-400'
                  : 'border-l-orange-400'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Intern info */}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className="font-semibold text-tata-navy cursor-pointer hover:underline"
                      onClick={() => navigate(`/interns/${intern.id}`)}
                    >
                      {intern.full_name}
                    </h3>
                    {canMatch && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 animate-pulse">
                        Now Matchable
                      </span>
                    )}
                    {waitingDays >= 7 && !canMatch && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                        Waiting {waitingDays}d
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {intern.intern_type} · {intern.branch} · {intern.college}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {intern.skills.map((s) => (
                      <span key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Preferred: {intern.preferred_domain} · Waiting since{' '}
                    {intern.match_logs?.[0]
                      ? new Date(intern.match_logs[0].matched_at).toLocaleDateString('en-IN')
                      : '—'}
                    {waitingDays > 0 && ` (${waitingDays} day${waitingDays > 1 ? 's' : ''})`}
                  </p>
                </div>

                {/* Best match info */}
                <div className="shrink-0 text-right min-w-[180px]">
                  {bestMatch ? (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Best match</p>
                      <p className="text-sm font-semibold text-tata-navy">
                        {bestMatch.guide.full_name}
                      </p>
                      <p className="text-xs text-gray-500">{bestMatch.guide.department}</p>
                      <p className="text-lg font-bold text-tata-blue">{pct(bestMatch.total_score)}</p>
                      <p className={`text-xs font-medium ${bestMatch.guide.is_at_capacity ? 'text-red-500' : 'text-green-600'}`}>
                        {bestMatch.guide.is_at_capacity
                          ? `Full (${bestMatch.guide.current_intern_count}/${bestMatch.guide.max_capacity})`
                          : `${bestMatch.guide.current_intern_count}/${bestMatch.guide.max_capacity} slots used`}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No matching guides</p>
                  )}
                </div>
              </div>

              {/* CTA for matchable */}
              {canMatch && (
                <div className="mt-4 pt-4 border-t border-green-200 flex items-center justify-between">
                  <p className="text-sm text-green-700 font-medium">
                    A slot has opened — confirm placement with {bestMatch!.guide.full_name}
                  </p>
                  <button
                    className="btn-primary bg-green-600 hover:bg-green-700"
                    onClick={() => navigate(`/interns/${intern.id}`)}
                  >
                    Review & Confirm →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Guide capacity overview */}
      {guides.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Guide Capacity Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {guides.filter((g) => g.is_complete).map((g) => (
              <div
                key={g.id}
                className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${
                  g.current_intern_count >= g.max_capacity
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
                onClick={() => navigate(`/guides/${g.id}`)}
              >
                <p className="text-sm font-medium text-gray-700 truncate">{g.full_name}</p>
                <p className="text-xs text-gray-400">{g.department}</p>
                <div className="mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                      <div
                        className={`h-full rounded-full ${
                          g.current_intern_count >= g.max_capacity ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((g.current_intern_count / g.max_capacity) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs ${g.current_intern_count >= g.max_capacity ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      {g.current_intern_count}/{g.max_capacity}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
