import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGuides } from '../api';
import { Guide } from '../types';
import CapacityBar from '../components/CapacityBar';
import SortableTable, { Column } from '../components/SortableTable';

export default function GuidesList() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getGuides().then(setGuides).finally(() => setLoading(false));
  }, []);

  const columns: Column<Guide>[] = [
     {
      key: 'p_no',
      label: 'P No',
      sortValue: (r) => r.p_no ?? '',
      render: (r) => <span className="font-medium text-tata-navy">{r.p_no}</span>,
    },
    {
      key: 'full_name',
      label: 'Name',
      sortValue: (r) => r.full_name,
      render: (r) => <span className="font-medium text-tata-navy">{r.full_name}</span>,
    },
    {
      key: 'department',
      label: 'Department',
      sortValue: (r) => r.department,
      render: (r) => r.department,
    },
    {
      key: 'expertise_domains',
      label: 'Domains',
      render: (r) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {r.expertise_domains.slice(0, 2).map((d) => (
            <span key={d} className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
              {d}
            </span>
          ))}
          {r.expertise_domains.length > 2 && (
            <span className="text-[11px] text-gray-400">+{r.expertise_domains.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key: 'capacity',
      label: 'Capacity',
      sortValue: (r) => r.current_intern_count ?? 0,
      render: (r) => (
        <CapacityBar current={r.current_intern_count ?? 0} max={r.max_capacity} />
      ),
    },
    {
      key: 'preferred_intern_types',
      label: 'Accepts',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.preferred_intern_types.map((t) => (
            <span key={t} className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {t}
            </span>
          ))}
        </div>
      ),
    },
    {
  key: 'availability',
  label: 'Availability',
  sortValue: (r) =>
    (r.current_intern_count ?? 0) >= r.max_capacity ? 1 : 0,

  render: (r) => {
    const full =
      (r.current_intern_count ?? 0) >= r.max_capacity;

    return (
      <span
        className={`text-xs font-medium ${
          full ? 'text-red-600' : 'text-green-600'
        }`}
      >
        {full ? 'Full' : 'Available'}
      </span>
    );
  },
},
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tata-navy">Guides</h1>
          <p className="text-sm text-gray-500 mt-0.5">{guides.length} registered guides</p>
        </div>
        <button onClick={() => navigate('/guides/new')} className="btn-primary">
          + Add Guide
        </button>
      </div>

      {/* Capacity summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-tata-navy">{guides.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Guides</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {guides.filter((g) => (g.current_intern_count ?? 0) < g.max_capacity ).length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">With Available Slots</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-500">
            {guides.filter((g) => (g.current_intern_count ?? 0) >= g.max_capacity).length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">At Full Capacity</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-7 h-7 border-4 border-tata-blue border-t-transparent rounded-full" />
          </div>
        ) : (
          <SortableTable
            columns={columns}
            data={guides}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/guides/${r.id}`)}
            emptyMessage="No guides registered yet."
          />
        )}
      </div>
    </div>
  );
}
