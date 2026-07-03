import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createIntern, updateIntern, getIntern, getAllSkillSuggestions, getGuides } from '../api';
import { InternType, InternStatus } from '../types';
import TagInput from '../components/TagInput';

const TYPES: InternType[] = ['B.Tech', 'MBA', 'Diploma', 'Sponsored'];
const STATUSES = ['Applied', 'Matched', 'Allotted', 'Completed', 'Waitlisted', 'YetToJoin', 'Left'];

const empty = {
  p_no: '',
  full_name: '', email: '', phone: '',
  intern_type: 'B.Tech' as InternType,
  college: '', branch: '', department: '',
  graduation_year: new Date().getFullYear() + 1,
  cgpa: '',
  twelfth_marks: '',
  tenth_marks: '',
  reference_name: '',
  skills: [] as string[],
  preferred_domain: '',
  start_date: '',
  end_date: '',
  duration_months: 3,
  project_required: 'Yes',
  status: 'Applied' as InternStatus,
  assigned_guide_id: '',
};

export default function AddIntern() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(empty);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getAllSkillSuggestions().then(setSuggestions);
    getGuides().then(setGuides);

    if (isEdit && id) {
      getIntern(id)
        .then((i: any) => {
          setForm({
            p_no: i.p_no || '',
            full_name: i.full_name || '',
            email: i.email || '',
            phone: i.phone || '',
            intern_type: i.intern_type || 'B.Tech',
            college: i.college || '',
            branch: i.branch || '',
            department: i.department || '',
            graduation_year: i.graduation_year || new Date().getFullYear() + 1,
            cgpa: i.cgpa ? String(i.cgpa) : '',
            twelfth_marks: i.twelfth_marks ? String(i.twelfth_marks) : '',
            tenth_marks: i.tenth_marks ? String(i.tenth_marks) : '',
            reference_name: i.reference_name || '',
            skills: i.skills || [],
            preferred_domain: i.preferred_domain || '',
            start_date: i.start_date ? new Date(i.start_date).toISOString().split('T')[0] : '',
            end_date: i.end_date ? new Date(i.end_date).toISOString().split('T')[0] : '',
            duration_months: i.duration_months || 3,
            project_required: i.project_required || 'Yes',
            status: i.status || 'Applied',
            assigned_guide_id: i.assigned_guide_id || '',
          });
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  function set(key: keyof typeof empty, val: unknown) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.intern_type) {
      setError('Name, email, and type are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        cgpa: form.cgpa ? Number(form.cgpa) : 0,
        graduation_year: Number(form.graduation_year),
        duration_months: Number(form.duration_months),
        twelfth_marks: form.twelfth_marks ? Number(form.twelfth_marks) : undefined,
        tenth_marks: form.tenth_marks ? Number(form.tenth_marks) : undefined,
      };
      
      if (isEdit && id) {
        await updateIntern(id, payload);
        navigate(`/interns/${id}`);
      } else {
        const result = await createIntern(payload);
        navigate(`/interns/${result.intern.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-tata-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-800 mb-2">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-tata-navy">
          {isEdit ? 'Edit Intern Profile' : 'Add New Intern'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Provide demographic details, domain details, and guide allocations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tata Motors P No & Personal info */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="p_no">P No *</label>
            <input id="p_no" className="input" value={form.p_no}
              onChange={(e) => set('p_no', e.target.value)} placeholder="e.g. 106245" required />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="full_name">Candidate Name *</label>
            <input id="full_name" className="input" value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)} placeholder="Arjun Desai" required />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="email">Email *</label>
            <input id="email" type="email" className="input" value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="arjun@college.edu.in" required />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" className="input" value={form.phone}
              onChange={(e) => set('phone', e.target.value)} placeholder="+91 98XXX XXXXX" />
          </div>
        </div>

        {/* Academic */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="intern_type">Intern Type *</label>
            <select id="intern_type" className="input" value={form.intern_type}
              onChange={(e) => set('intern_type', e.target.value as InternType)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="graduation_year">Graduation Year</label>
            <input id="graduation_year" type="number" className="input" value={form.graduation_year}
              onChange={(e) => set('graduation_year', e.target.value)} min={2020} max={2030} />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="college">College</label>
            <input id="college" className="input" value={form.college}
              onChange={(e) => set('college', e.target.value)} placeholder="IIT Bombay" />
          </div>
          <div>
            <label className="label" htmlFor="twelfth_marks">12th Marks (%)</label>
            <input id="twelfth_marks" type="number" step="0.01" min="0" max="100" className="input" value={form.twelfth_marks}
              onChange={(e) => set('twelfth_marks', e.target.value)} placeholder="75.50" />
          </div>
          <div>
            <label className="label" htmlFor="tenth_marks">10th Marks (%)</label>
            <input id="tenth_marks" type="number" step="0.01" min="0" max="100" className="input" value={form.tenth_marks}
              onChange={(e) => set('tenth_marks', e.target.value)} placeholder="82.00" />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="reference_name">Reference / Referrer</label>
            <input id="reference_name" className="input" value={form.reference_name}
              onChange={(e) => set('reference_name', e.target.value)} placeholder="e.g. Dr. A. Sharma" />
          </div>
          <div>
            <label className="label" htmlFor="branch">Branch</label>
            <input id="branch" className="input" value={form.branch}
              onChange={(e) => set('branch', e.target.value)} placeholder="Mechanical Engineering" />
          </div>
          <div>
            <label className="label" htmlFor="department">Department</label>
            <input id="department" className="input" value={form.department}
              onChange={(e) => set('department', e.target.value)} placeholder="Manufacturing" />
          </div>
          <div>
            <label className="label" htmlFor="cgpa">CGPA</label>
            <input id="cgpa" type="number" step="0.01" min="0" max="10" className="input" value={form.cgpa}
              onChange={(e) => set('cgpa', e.target.value)} placeholder="8.50" />
          </div>
          <div>
            <label className="label" htmlFor="project_required">Project Required</label>
            <select id="project_required" className="input" value={form.project_required}
              onChange={(e) => set('project_required', e.target.value)}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>

        {/* Skills & Domain */}
        <div>
          <label className="label">Skills</label>
          <TagInput
            value={form.skills}
            onChange={(tags) => set('skills', tags)}
            suggestions={suggestions}
            placeholder="AutoCAD, SolidWorks… (Enter to add)"
          />
          <p className="text-xs text-gray-400 mt-1">Type and press Enter or comma to add a skill.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="preferred_domain">Project Domain</label>
            <input id="preferred_domain" className="input" value={form.preferred_domain}
              onChange={(e) => set('preferred_domain', e.target.value)} placeholder="Manufacturing Engineering" />
          </div>
          <div>
            <label className="label" htmlFor="status">Intern Status</label>
            <select id="status" className="input" value={form.status}
              onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
        </div>

        {/* Internship details */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="start_date">Date of Joining</label>
            <input id="start_date" type="date" className="input" value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="end_date">Date of Leaving</label>
            <input id="end_date" type="date" className="input" value={form.end_date}
              onChange={(e) => set('end_date', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="duration_months">Duration (Months)</label>
            <input id="duration_months" type="number" min="1" max="24" className="input" value={form.duration_months}
              onChange={(e) => set('duration_months', Number(e.target.value))} />
          </div>
        </div>

        {/* Manual Guide Assignment */}
        <div>
          <label className="label" htmlFor="assigned_guide_id">Manually Assign Guide</label>
          <select id="assigned_guide_id" className="input" value={form.assigned_guide_id}
            onChange={(e) => set('assigned_guide_id', e.target.value)}>
            <option value="">-- No Guide Assigned --</option>
            {guides.map((g) => (
              <option key={g.id} value={g.id}>
                {g.full_name} ({g.department}) - {g.interns.length}/{g.max_capacity} allotted
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Submit & Run Matching'}
          </button>
        </div>
      </form>
    </div>
  );
}
