import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { getInterns, importInternsFile, deleteIntern } from '../api';
import { Intern, InternStatus, InternType } from '../types';
import StatusBadge from '../components/StatusBadge';
import SortableTable, { Column } from '../components/SortableTable';

const STATUSES: InternStatus[] = ['Applied', 'Matched', 'Completed', 'Waitlisted', 'Allotted','YetToJoin','Left'];
const TYPES: InternType[] = ['B.Tech', 'MBA', 'Diploma', 'Sponsored'];

export default function InternsList() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const status = searchParams.get('status') ?? '';
  const internType = searchParams.get('intern_type') ?? '';
  const branch = searchParams.get('branch') ?? '';
  const search = searchParams.get('search') ?? '';

  function downloadTemplate() {
    const headers = [
      'full_name',
      'email',
      'phone',
      'intern_type',
      'college',
      'branch',
      'graduation_year',
      'cgpa',
      'skills',
      'preferred_domain',
      'start_date',
      'duration_months',
      'end_date'
    ];

    const sampleRow = [
      'Aarav Sharma',
      'aarav.sharma@example.com',
      '9876543210',
      'B.Tech',
      'Pimpri College of Engineering',
      'Mechanical',
      '2026',
      '8.4',
      'AutoCAD, SolidWorks, Teamwork',
      'Manufacturing',
      '2026-06-01',
      '3',
      '2026-09-01',
    ];

    const rows = [headers, sampleRow];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Interns Template');

    const instructions = XLSX.utils.aoa_to_sheet([
      ['Field', 'Description', 'Example'],
      ['full_name', 'Intern full name', 'Aarav Sharma'],
      ['email', 'Unique email address', 'aarav.sharma@example.com'],
      ['phone', 'Phone number', '9876543210'],
      ['intern_type', 'B.Tech, MBA, Diploma, or Sponsored', 'B.Tech'],
      ['college', 'College or institute name', 'Pimpri College of Engineering'],
      ['branch', 'Branch / stream', 'Mechanical'],
      ['graduation_year', 'Year of graduation', '2026'],
      ['cgpa', 'CGPA on a 10-point scale', '8.4'],
      ['skills', 'Comma-separated skills in one cell', 'AutoCAD, SolidWorks, Teamwork'],
      ['preferred_domain', 'Preferred domain', 'Manufacturing'],
      ['start_date', 'ISO date or spreadsheet date', '2026-06-01'],
      ['duration_months', 'Internship duration in months', '3'],
    ]);
    XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');

    const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'interns-template.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function setParam(key: string, val: string) {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val);
    else p.delete(key);
    setSearchParams(p);
  }

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (internType) params.intern_type = internType;
    if (branch) params.branch = branch;
    if (search) params.search = search;

    getInterns(params)
      .then(setInterns)
      .finally(() => setLoading(false));
  }, [status, internType, branch, search]);

  const columns: Column<Intern>[] = [
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
      key: 'intern_type',
      label: 'Type',
      sortValue: (r) => r.intern_type,
      render: (r) => (
        <span className="text-xs px-2 py-0.5 rounded bg-tata-light text-tata-navy font-medium">
          {r.intern_type}
        </span>
      ),
    },
    {
      key: 'branch',
      label: 'Stream',
      sortValue: (r) => r.branch,
      render: (r) => r.branch,
    },
    {
      key: 'skills',
      label: 'Skills',
      render: (r) => (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {r.skills.slice(0, 3).map((s) => (
            <span key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {s}
            </span>
          ))}
          {r.skills.length > 3 && (
            <span className="text-[11px] text-gray-400">+{r.skills.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'assigned_guide',
      label: 'Guide',
      sortValue: (r) => r.assigned_guide?.full_name ?? '',
      render: (r) => r.assigned_guide ? (
        <span className="text-sm">{r.assigned_guide.full_name}</span>
      ) : (
        <span className="text-gray-400 text-xs">—</span>
      ),
    },
    {
      key: 'start_date',
      label: 'Start Date',
      sortValue: (r) => r.start_date,
      render: (r) => new Date(r.start_date).toLocaleDateString('en-IN'),
    },
    {
      key: 'duration_months',
      label: 'Duration',
      sortValue: (r) => r.duration_months,
      render: (r) => `${r.duration_months}m`,
    },
    {
      key: 'end_date',
      label: 'End Date',
      sortValue: (r) => r.end_date,
      render: (r) => new Date(r.end_date).toLocaleDateString('en-IN'),
    },
    {
      key: 'actions' as any,
      label: 'Actions',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete ${r.full_name}?`)) {
              deleteIntern(r.id)
                .then(() => {
                  setInterns((prev) => prev.filter((item) => item.id !== r.id));
                })
                .catch((err) => alert('Failed to delete: ' + err.message));
            }
          }}
          className="text-red-600 hover:text-red-800 font-medium text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
        >
          🗑️ Delete
        </button>
      ),
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tata-navy">Interns</h1>
          <p className="text-sm text-gray-500 mt-0.5">{interns.length} record{interns.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/interns/new')} className="btn-primary">
            + Add Intern
          </button>
          <button className="btn-secondary" onClick={downloadTemplate}>
            Download Template
          </button>
          <label className="btn-secondary cursor-pointer">
            Upload
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const res = await importInternsFile(f);
                  // navigate to results page with server response
                  navigate('/interns/import-results', { state: res });
                } catch (err: any) {
                  alert('Import failed: ' + err.message);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Search</label>
          <input
            className="input w-52"
            placeholder="Name or skill or P.No"
            value={search}
            onChange={(e) => setParam('search', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input w-36" value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input w-32" value={internType} onChange={(e) => setParam('intern_type', e.target.value)}>
            <option value="">All</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Stream</label>
          <input
            className="input w-44"
            placeholder="e.g. Mechanical…"
            value={branch}
            onChange={(e) => setParam('branch', e.target.value)}
          />
        </div>
        {(status || internType || branch || search) && (
          <button
            className="btn-secondary h-9"
            onClick={() => setSearchParams({})}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-7 h-7 border-4 border-tata-blue border-t-transparent rounded-full" />
          </div>
        ) : (
          <SortableTable
            columns={columns}
            data={interns}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/interns/${r.id}`)}
            emptyMessage="No interns match your filters."
          />
        )}
      </div>
    </div>
  );
}
