import { useEffect, useState } from 'react';
import { getAllottedBreakdown } from '../api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Exceljs from 'exceljs';
type BreakdownItem = {
  name: string;
  count: number;
};

export default function AllottedBreakdown() {
  const [filter, setFilter] = useState<'guide' | 'branch' | 'department'>('guide');
  const [data, setData] = useState<BreakdownItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [internName, setInternName] = useState('');
const [pno, setPno] = useState('');
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setLoading(true);

    getAllottedBreakdown(filter)
      .then(setData)
      .finally(() => setLoading(false));
  }, [filter]);

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );
  const total = filteredData.reduce((sum, item) => sum + item.count, 0);
  const handleDownload = () => {}
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-tata-navy">
          Allotted Intern Breakdown
        </h1>
        <p className="text-sm text-gray-500">
          View allotted interns by guide or branch
        </p>
      </div>

      <div className="card p-4">
        <label className="label">View By</label>

        <select
          className="input w-56"
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as 'guide' | 'branch' | 'department')
          }
        >
          <option value="guide">Guide Wise</option>
          <option value="branch">Branch Wise</option>
          <option value="department">Department Wise</option>
        </select>
      </div>
      <button
  onClick={() =>
    window.open(
      `/api/dashboard/allotted-download?filter=${filter}`,
      '_blank'
    )
  }
  className="btn-primary"
>
  Download Participants
</button>
          <div className="card p-4">
  <label className="label">Search</label>
  <input
    type="text"
    className="input w-full"
    placeholder={`Search ${filter}`}
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
</div>

<div className="card p-6">
  <h2 className="text-lg font-semibold mb-4">
    {filter === 'guide'
      ? 'Guide Wise Allotment'
      : filter === 'branch'
      ? 'Branch Wise Allotment'
      : 'Department Wise Allotment'}
  </h2>

  <ResponsiveContainer width="100%" height={400}>
  <BarChart data={filteredData}>
    <CartesianGrid strokeDasharray="3 3" />
    
    <XAxis
      dataKey="name"
      angle={-45}
      textAnchor="end"
      height={100}
    />

    <YAxis />

    <Tooltip />

    <Bar
      dataKey="count"
      fill="#0F4C81"
      radius={[4, 4, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>
</div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            Loading...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">
                  {filter === 'guide' ? 'Guide' : filter === 'branch' ? 'Branch' : 'Department'}
                </th>
                <th className="text-right p-4">
                  Count
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((item) => (
                <tr
                  key={item.name}
                  className="border-b"
                >
                  <td className="p-4">{item.name}</td>
                  <td className="p-4 text-right font-medium">
                    {item.count}
                  </td>
                </tr>
              ))}

              <tr className="bg-gray-50 font-bold">
                <td className="p-4">Total</td>
                <td className="p-4 text-right">
                  {total}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}