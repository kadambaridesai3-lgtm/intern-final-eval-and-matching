import { useEffect, useState } from 'react';
import { getWaitlistedBreakdown } from '../api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import './WaitlistedBreakdown.css';

type Item = {
  name: string;
  count: number;
};

export default function WaitlistedBreakdown() {
  const [data, setData] = useState<Item[]>([]);
  const [search,setSearch] = useState('');

  useEffect(() => {
    getWaitlistedBreakdown().then(setData);
  }, []);
  const filteredData = data.filter((item)=>item.name.toLowerCase().includes(search.toLowerCase()));
  const total = filteredData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-tata-navy">
        Waitlisted Interns By Branch
      </h1>
      <div className='card p-4'>
  <label className="label">Search</label>
  <input
    type="text"
    className="input w-full"
    placeholder={`Search`}
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
</div>
<button
  onClick={async () => {
    try {
      const res = await fetch('/api/dashboard/waitlisted-download');
      if (!res.ok) throw new Error('Failed to download file');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'waitlisted-interns.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download could not be started. Please verify browser download permissions.");
    }
  }}
  className="btn-primary"
>
  Download Participants
</button>
<div className="card p-4 mt-6">
  <h2 className="text-lg font-semibold mb-4">
    Waitlisted Interns by Branch
  </h2>

  <ResponsiveContainer width="100%" height={400}>
    <BarChart data={filteredData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        dataKey="name"
        angle={-45}
        textAnchor="end"
        height={80}
      />
      <YAxis />
      <Tooltip />
      <Bar
        dataKey="count"
        fill="#2563eb"
      />
    </BarChart>
  </ResponsiveContainer>
</div>
      <div className="card p-4 mt-6">
        {filteredData.map((item) => (
          <div
            key={item.name}
            className="flex justify-between py-2 border-b"
          >
            <span>{item.name}</span>
            <span>{item.count}</span>
          </div>
        ))}

        <div className="flex justify-between font-bold mt-4">
          <span>Total</span>
          <span>{total}</span>
        </div>
      </div>
    </div>
  );
}