import { useLocation, useNavigate } from 'react-router-dom';

export default function ImportResults() {
  const { state } = useLocation() as any;
  const navigate = useNavigate();

  if (!state) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">No import results</h1>
        <p className="mt-2">No import data found. Go back to Interns to upload a file.</p>
        <button className="btn-secondary mt-4" onClick={() => navigate('/interns')}>Back</button>
      </div>
    );
  }

  const { created, created_ids, errors } = state;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-tata-navy">Import Results</h1>
      <p className="text-sm text-gray-500 mt-1">Summary of the last import</p>

      <div className="card p-4 mt-6">
        <p className="font-medium">Created: {created}</p>
        <p className="mt-1 text-sm text-gray-600">IDs created: {created_ids?.join(', ') || '—'}</p>
      </div>

      <div className="card p-4 mt-4">
        <h2 className="font-semibold">Errors</h2>
        {errors && errors.length > 0 ? (
          <table className="w-full mt-3 text-left">
            <thead>
              <tr className="text-sm text-gray-600">
                <th className="py-2">Row</th>
                <th className="py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((e: any) => (
                <tr key={e.row} className="border-t">
                  <td className="py-2 text-sm font-medium">{e.row}</td>
                  <td className="py-2 text-sm text-red-600">{e.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-gray-600">No errors — all rows imported successfully.</p>
        )}
      </div>

      <div className="mt-4">
        <button className="btn-secondary" onClick={() => navigate('/interns')}>Back to Interns</button>
      </div>
    </div>
  );
}
