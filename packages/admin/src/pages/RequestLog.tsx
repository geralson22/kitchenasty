import { useState, useEffect } from 'react';

interface RequestEntry {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string | null;
  requestId: string | null;
  userId: string | null;
  userType: string | null;
  createdAt: string;
}

const TIME_RANGES = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '48h', hours: 48 },
  { label: '7d', hours: 168 },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function RequestLog() {
  const [logs, setLogs] = useState<RequestEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [ipFilter, setIpFilter] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50', hours: String(hours) });
    if (ipFilter) params.set('ip', ipFilter);
    if (pathFilter) params.set('path', pathFilter);
    if (methodFilter) params.set('method', methodFilter);

    fetch(`/api/developer/request-logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setLogs(res.data);
          setTotal(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, hours, ipFilter, pathFilter, methodFilter, token]);

  const getStatusColor = (code: number) => {
    if (code >= 500) return 'text-red-600';
    if (code >= 400) return 'text-yellow-600';
    return 'text-gray-700';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Request Log</h1>
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r.hours}
              onClick={() => { setHours(r.hours); setPage(1); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                hours === r.hours
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Filter by IP..."
          value={ipFilter}
          onChange={(e) => { setIpFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-40"
        />
        <input
          type="text"
          placeholder="Filter by path (e.g., .env)..."
          value={pathFilter}
          onChange={(e) => { setPathFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64"
        />
        <select
          value={methodFilter}
          onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
        <span className="px-3 py-2 text-sm text-gray-500 self-center">
          {total.toLocaleString()} requests
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-left">Path</th>
              <th className="px-4 py-3 text-right">Status</th>
              <th className="px-4 py-3 text-right">Time (ms)</th>
              <th className="px-4 py-3 text-left">IP</th>
              <th className="px-4 py-3 text-left">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No requests found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${METHOD_COLORS[log.method] || 'bg-gray-100 text-gray-700'}`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs max-w-[300px] truncate" title={log.path}>
                    {log.path}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${getStatusColor(log.statusCode)}`}>
                    {log.statusCode}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{log.responseTime}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.ipAddress || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {log.userId ? `${log.userType || 'user'}:${log.userId.substring(0, 8)}` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}