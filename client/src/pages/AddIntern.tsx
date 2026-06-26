import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIntern, getAllSkillSuggestions } from '../api';
import { InternType } from '../types';
import TagInput from '../components/TagInput';

const TYPES: InternType[] = ['B.Tech', 'MBA', 'Diploma', 'Sponsored'];

const empty = {
  full_name: '', email: '', phone: '',
  intern_type: 'B.Tech' as InternType,
  college: '', branch: '',department: '',
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
};

export default function AddIntern() {
  const [form, setForm] = useState(empty);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getAllSkillSuggestions().then(setSuggestions);
  }, []);

  function set(key: keyof typeof empty, val: unknown) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.intern_type) {
      setError('Name, email, and type are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await createIntern({
        ...form,
        cgpa: Number(form.cgpa),
        graduation_year: Number(form.graduation_year),
        duration_months: Number(form.duration_months),
      });
      navigate(`/interns/${result.intern.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-800 mb-2">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-tata-navy">Add New Intern</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Matching runs automatically on submission.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Personal info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="label" htmlFor="full_name">Full Name *</label>
            <input id="full_name" className="input" value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)} placeholder="Arjun Desai" required />
          </div>
          <div>
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
            <label className="label" htmlFor="branch">Branch / Stream</label>
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

        <div>
          <label className="label" htmlFor="preferred_domain">Preferred Domain</label>
          <input id="preferred_domain" className="input" value={form.preferred_domain}
            onChange={(e) => set('preferred_domain', e.target.value)} placeholder="Manufacturing Engineering" />
        </div>

        {/* Internship details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="start_date">Start Date</label>
            <input id="start_date" type="date" className="input" value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div>
  <label className="label" htmlFor="end_date">End Date</label>
  <input
    id="end_date"
    type="date"
    className="input"
    value={form.end_date}
    onChange={(e) => set('end_date', e.target.value)}
  />
</div>
          <div>
            <label className="label" htmlFor="duration_months">Duration (months)</label>
            <input id="duration_months" type="number" min="1" max="24" className="input" value={form.duration_months}
              onChange={(e) => set('duration_months', Number(e.target.value))} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving & Matching…' : 'Submit & Run Matching'}
          </button>
        </div>
      </form>
    </div>
  );
}
