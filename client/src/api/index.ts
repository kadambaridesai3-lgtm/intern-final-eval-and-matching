import { Intern, Guide, DashboardData, MatchResult } from '../types';

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard = () => req<DashboardData>('/dashboard');

export const getAllottedBreakdown = (filter: 'guide' | 'branch' | 'department') => req<{ name: string; count: number }[]>(`/dashboard/allotted-breakdown?filter=${filter}`);

export const getWaitlistedBreakdown = () =>
  req<Array<{ name: string; count: number }>>(
    '/dashboard/waitlisted-breakdown'
  );
export const getYetToJoinBreakdown = () =>
  req<Array<{ name: string; count: number }>>(
    '/dashboard/yet-to-join-breakdown'
  );
// ── Interns ──────────────────────────────────────────────────────────────────
export const getInterns = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return req<Intern[]>(`/interns${qs}`);
};

export const getIntern = (id: string) => req<Intern>(`/interns/${id}`);
export const deleteIntern = (id: string) => req<any>(`/interns/${id}`, { method: 'DELETE' });

export const createIntern = (data: Partial<Intern>) =>
  req<{ intern: Intern; match_result: MatchResult[]; match_log: unknown }>(
    '/interns',
    { method: 'POST', body: JSON.stringify(data) },
  );

export const confirmMatch = (id: string, guideId?: string, notes?: string) =>
  req<Intern>(`/interns/${id}/confirm`, {
    method: 'PATCH',
    body: JSON.stringify({ guide_id: guideId, notes }),
  });

export const completedIntern = (id: string) =>
  req<{ intern: Intern; newly_matched_from_waitlist: string[] }>(
    `/interns/${id}/completed`,
    { method: 'PATCH', body: JSON.stringify({}) },
  );

export const updateInternProject = (id: string, data: { Project_title: string; Project_details: string }) =>
  req<Intern>(`/interns/${id}/Project`, { method: 'PATCH', body: JSON.stringify(data) });

// ── Guides ───────────────────────────────────────────────────────────────────
export const getGuides = () => req<Guide[]>('/guides');

export const getGuide = (id: string) => req<Guide>(`/guides/${id}`);

export const createGuide = (data: Partial<Guide>) =>
  req<Guide>('/guides', { method: 'POST', body: JSON.stringify(data) });

export const updateGuide = (id: string, data: Partial<Guide>) =>
  req<Guide>(`/guides/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// ── Matching ─────────────────────────────────────────────────────────────────
export const getMatches = (internId: string) =>
  req<{ intern: Intern; matches: MatchResult[] }>(`/match/${internId}`);

export const runWaitlistMatching = () =>
  req<{ processed: number; newly_matched: number; matched_intern_ids: string[] }>(
    '/match/run',
    { method: 'POST', body: JSON.stringify({}) },
  );

// ── Import ───────────────────────────────────────────────────────────────────
export const importInternsFile = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return fetch(`${BASE}/interns/import`, {
    method: 'POST',
    body: form,
  }).then(async (r) => {
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || `Import failed: ${r.status}`);
    }
    return r.json();
  });
};

// ── AutoAllotted helpers ─────────────────────────────────────────────────────
export async function getAllSkillSuggestions(): Promise<string[]> {
  const [interns, guides] = await Promise.all([getInterns(), getGuides()]);
  const set = new Set<string>();
  interns.forEach((i) => i.skills.forEach((s) => set.add(s)));
  guides.forEach((g) => g.required_skills.forEach((s) => set.add(s)));
  return Array.from(set).sort();
}

export async function getAllDomainSuggestions(): Promise<string[]> {
  const guides = await getGuides();
  const set = new Set<string>();
  guides.forEach((g) => g.expertise_domains.forEach((d) => set.add(d)));
  return Array.from(set).sort();
}

// ── Attendance ───────────────────────────────────────────────────────────────
export const uploadAttendance = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return fetch(`${BASE}/attendance/upload`, {
    method: 'POST',
    body: form,
  }).then(async (r) => {
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || `Upload failed: ${r.status}`);
    }
    return r.json();
  });
};
export const getAttendanceSummaries = () => req<any[]>('/attendance/summaries');
export const getAttendanceSummary = (internId: string) => req<any>(`/attendance/summary/${internId}`);
export const getAttendanceRecords = (internId: string) => req<any[]>(`/attendance/records/${internId}`);
export const getFlaggedAttendance = () => req<any[]>('/attendance/flagged');
export const clearAttendanceData = () => req<any>('/attendance/records', { method: 'DELETE' });

// ── Guide Feedback ───────────────────────────────────────────────────────────
export const submitGuideFeedback = (data: any) =>
  req<any>('/guide-feedback', { method: 'POST', body: JSON.stringify(data) });
export const getGuideFeedbacks = () => req<any[]>('/guide-feedback');
export const getGuideFeedbackById = (internId: string) => req<any>(`/guide-feedback/${internId}`);
export const deleteGuideFeedback = (internId: string) =>
  req<any>(`/guide-feedback/${internId}`, { method: 'DELETE' });

// ── Final Evaluation ─────────────────────────────────────────────────────────
export const generateFinalEvaluations = () =>
  req<any>('/final-evaluation/generate', { method: 'POST', body: '{}' });
export const getFinalEvaluations = () => req<any[]>('/final-evaluation');
export const getFinalEvaluation = (internId: string) => req<any>(`/final-evaluation/${internId}`);
export const deleteFinalEvaluation = (internId: string) =>
  req<any>(`/final-evaluation/${internId}`, { method: 'DELETE' });

