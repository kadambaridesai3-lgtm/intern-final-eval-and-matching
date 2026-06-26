import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGuide, updateGuide } from '../api';
import { Guide } from '../types';
import CapacityBar from '../components/CapacityBar';
import StatusBadge from '../components/StatusBadge';

export default function GuideDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [capacityInput, setCapacityInput] = useState(20);
  const [savingCapacity, setSavingCapacity] = useState(false);

  useEffect(() => {
    if (!id) return;
    getGuide(id).then((g) => { setGuide(g); setCapacityInput(g.max_capacity); }).finally(() => setLoading(false));
  }, [id]);

  async function handleSaveCapacity() {
    if (!id || !guide) return;
    setSavingCapacity(true);
    try {
      const updated = await updateGuide(id, { max_capacity: capacityInput });
      setGuide((g) => g ? { ...g, max_capacity: updated.max_capacity } : g);
      setEditingCapacity(false);
    } finally {
      setSavingCapacity(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-tata-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!guide) return <div className="p-8 text-red-600">Guide not found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate('/guides')} className="text-sm text-gray-500 hover:text-gray-800 mb-2">
          ← Guides
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-tata-navy">{guide.full_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{guide.department}</p>
          </div>
          <div className="flex items-center gap-3">
           <span
  className={`text-xs font-medium ${
    guide.current_intern_count >= guide.max_capacity
      ? 'text-red-600'
      : 'text-green-600'
  }`}
>
  {guide.current_intern_count >= guide.max_capacity
    ? '● Full Capacity'
    : '● Available'}
</span>
            <button
              onClick={() => navigate(`/guides/${guide.id}/edit`)}
              className="btn-secondary"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Profile</h2>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">Capacity</p>
                {!editingCapacity && (
                  <button
                    className="text-xs text-tata-blue hover:underline"
                    onClick={() => setEditingCapacity(true)}
                  >
                    Edit
                  </button>
                )}
              </div>
              {editingCapacity ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={guide.current_intern_count}
                    max={20}
                    className="input text-sm w-20 py-1"
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(Number(e.target.value))}
                  />
                  <button
                    className="btn-primary text-xs py-1 px-2"
                    onClick={handleSaveCapacity}
                    disabled={savingCapacity}
                  >
                    {savingCapacity ? '…' : 'Save'}
                  </button>
                  <button
                    className="btn-secondary text-xs py-1 px-2"
                    onClick={() => { setEditingCapacity(false); setCapacityInput(guide.max_capacity); }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <CapacityBar current={guide.current_intern_count} max={guide.max_capacity} />
                  {guide.current_intern_count >= guide.max_capacity && (
                    <p className="text-xs text-red-500 font-medium mt-1">At full capacity</p>
                  )}
                </>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1.5">Expertise Domains</p>
              <div className="flex flex-wrap gap-1.5">
                {guide.expertise_domains.map((d) => (
                  <span key={d} className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1.5">Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {guide.required_skills.map((s) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-tata-light text-tata-navy font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1.5">Preferred Intern Types</p>
              <div className="flex flex-wrap gap-1.5">
                {guide.preferred_intern_types.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Intern lists */}
        <div className="lg:col-span-2 space-y-4">
          {/* complete / Matched interns */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-700 mb-3">
              Matched/Active Interns ({guide.matched_interns?.length ?? 0})
            </h2>
            {(guide.matched_interns?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400">No current interns.</p>
            ) : (
              <div className="space-y-2">
                {guide.matched_interns!.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-tata-light cursor-pointer transition-colors"
                    onClick={() => navigate(`/interns/${i.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-tata-navy">{i.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {i.intern_type} · {i.branch}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {i.start_date && (
                        <span className="text-xs text-gray-400">
                          from {new Date(i.start_date).toLocaleDateString('en-IN')}
                        </span>
                      )}
                      <StatusBadge status={i.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Allotted interns */}
          {(guide.active_interns?.length ?? 0) > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-700 mb-3">
                Allotted Interns ({guide.active_interns!.length})
              </h2>
              <div className="space-y-2">
                {guide.active_interns!.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-tata-light cursor-pointer transition-colors"
                    onClick={() => navigate(`/interns/${i.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-600">{i.full_name}</p>
                      <p className="text-xs text-gray-400">{i.intern_type} · {i.branch}</p>
                    </div>
                    <StatusBadge status={i.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Completed interns */}
{(guide.completed_interns?.length ?? 0) > 0 && (
  <div className="card p-5">
    <h2 className="font-semibold text-gray-700 mb-3">
      Completed Interns ({guide.completed_interns!.length})
    </h2>

    <div className="space-y-2">
      {guide.completed_interns!.map((i) => (
        <div
          key={i.id}
          className="flex items-center justify-between p-3 rounded-lg bg-green-50 hover:bg-green-100 cursor-pointer transition-colors"
          onClick={() => navigate(`/interns/${i.id}`)}
        >
          <div>
            <p className="text-sm font-medium text-gray-700">
              {i.full_name}
            </p>

            <p className="text-xs text-gray-500">
              {i.intern_type} · {i.branch}
            </p>
          </div>

          <StatusBadge status={i.status} />
        </div>
      ))}
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
}
