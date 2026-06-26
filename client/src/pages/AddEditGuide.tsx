import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createGuide, updateGuide, getGuide, getAllSkillSuggestions } from '../api';
import { InternType } from '../types';
import TagInput from '../components/TagInput';

import Select from 'react-select'

const skillOptions = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Artificial Intelligence', label: 'Artificial Intelligence' },
  { value: 'Automation and robotics', label: 'Automation and robotics' },
  { value: 'Automobile Engineering', label: 'Automobile Engineering' },
  { value: 'Business Analytics & HR & Supply chain Management', label: 'Business Analytics & HR & Supply' },
  { value: 'Chemical engineering specialization', label: 'Chemical engineering specialization' },
  { value: 'Commerce', label: 'Commerce' },
  { value: 'Computer', label: 'Computer' },
  { value: 'Computer engineering', label: 'Computer engineering' },
  { value: 'Computer Science Engineering', label: 'Computer Science Engineering' },
  { value: 'Data Science', label: 'Data Science' },
  { value: 'Economics Hons', label: 'Economics Hons' },
  { value: 'Electrical & Telecommunication Engineering', label: 'Electrical & Telecommunication Engineering' },
  { value: 'Electrical Engineering', label: 'Electrical Engineering' },
  { value: 'Electronics & Communication Engineering(ECE)', label: 'Electronics & Communication Eng' },
  { value: 'Electronics and Telecommunication', label: 'Electronics and Telecommunication' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Finance & Accounting', label: 'Finance & Accounting' },
  { value: 'Human Recores', label: 'Human Resources' },
  { value: 'Manufacturing Science and Engineering', label: 'Manufacturing Science and Engineering' },
  { value: 'Mechanical Engineering', label: 'Mechanical Engineering' },
  { value: 'Mechatronics Engineering', label: 'Mechatronics Engineering' },
  { value: 'Metallurgy and Material Technology', label: 'Metallurgy and Material Technology' },
  { value: 'Operation and supply chain management', label: 'Operation and supply chain management' },
  { value: 'PGDM', label: 'PGDM' },
];

const TYPES: InternType[] = ['B.Tech', 'MBA', 'Diploma', 'Sponsored'];
const skillSuggestions = [
  'Admin',
  'Artificial Intelligence',
  'Automation and robotics',
  'Automobile Engineering',
  'Business Analytics & HR & Supply',
  'Chemical engineering specialization',
  'Commerce',
  'Computer',
  'Computer engineering',
  'Computer Science Engineering',
  'Data Science',
  'Economics Hons',
  'Electrical & Telecommunication Engineering',
  'Electrical Engineering',
  'Electronics & Communication Eng',
  'Electronics and Telecommunication',
  'Finance',
  'Finance & Accounting',
  'Human Resources',
  'Manufacturing Science and Engineering',
  'Mechanical Engineering',
  'Mechatronics Engineering',
  'Metallurgy and Material Technology',
  'Operation and supply chain management',
  'PGDM',
];
const empty = {
  full_name: '',
  department: '',
  expertise_domains: [] as string[],
  required_skills: [] as string[],
  preferred_intern_types: [] as InternType[],
  max_capacity: 20,
  is_complete: false,
};

export default function AddEditGuide() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(empty);
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllSkillSuggestions().then(setSkillSuggestions);

    if (isEdit && id) {
      getGuide(id)
        .then((g) => setForm({
          full_name: g.full_name,
          department: g.department,
          expertise_domains: g.expertise_domains,
          required_skills: g.required_skills,
          preferred_intern_types: g.preferred_intern_types,
          max_capacity: g.max_capacity,
          is_complete: g.is_complete,
        }))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  function set<K extends keyof typeof empty>(key: K, val: typeof empty[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function toggleType(t: InternType) {
    const cur = form.preferred_intern_types;
    set(
      'preferred_intern_types',
      cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.department) {
      setError('Name and department are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit && id) {
        await updateGuide(id, form);
        navigate(`/guides/${id}`);
      } else {
        const guide = await createGuide(form);
        navigate(`/guides/${guide.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
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
          {isEdit ? 'Edit Guide' : 'Add New Guide'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label" htmlFor="full_name">Full Name *</label>
            <input id="full_name" className="input" value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="department">Department *</label>
            <input id="department" className="input" value={form.department}
              onChange={(e) => set('department', e.target.value)}
              placeholder="e.g. Manufacturing, R&D" required />
          </div>
          <div>
            <label className="label" htmlFor="max_capacity">Max Capacity</label>
            <input id="max_capacity" type="number" min="1" max="20" className="input"
              value={form.max_capacity}
              onChange={(e) => set('max_capacity', Number(e.target.value))} />
          </div>
        </div>

        <div>
          <label className="label">Expertise Domains</label>
          <TagInput
            value={form.expertise_domains}
            onChange={(tags) => set('expertise_domains', tags)}
            suggestions={domainSuggestions}
            placeholder="Vehicle Dynamics, CAD/CAM… (Enter to add)"
          />
        </div>

        <div>
          <label className="label">Required Skills</label>
          <Select
  isMulti
  options={skillOptions}
  value={skillOptions.filter((option) =>
    form.required_skills.includes(option.value)
  )}
  onChange={(selectedOptions) =>
    set(
      'required_skills',
      selectedOptions.map((option) => option.value)
    )
  }
  placeholder="Select Required Skills"
/>
        </div>

        <div>
          <label className="label">Preferred Intern Types</label>
          <div className="flex gap-3 flex-wrap">
            {TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.preferred_intern_types.includes(t)}
                  onChange={() => toggleType(t)}
                  className="rounded border-gray-300 text-tata-blue focus:ring-tata-blue"
                />
                <span className="text-sm text-gray-700">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_complete}
              onChange={(e) => set('is_complete', e.target.checked)}
              className="rounded border-gray-300 text-tata-blue focus:ring-tata-blue"
            />
            <span className="text-sm text-gray-700">Guide is complete and available for matching</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Guide'}
          </button>
        </div>
      </form>
    </div>
  );
}
