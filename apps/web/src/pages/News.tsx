import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export function News() {
  const [days, setDays] = useState(4);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['news', days],
    queryFn: () => api.newsDigest(days),
  });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">News Digest</h1>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            {[1, 2, 4, 7, 14].map((d) => (
              <option key={d} value={d}>
                Last {d} day{d > 1 ? 's' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            ↻
          </button>
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Unique stories extracted from your newsletters, with duplicates merged across sources.
      </p>

      {isLoading || isFetching ? (
        <p className="text-slate-400">Analyzing newsletters…</p>
      ) : isError ? (
        <p className="text-red-500">Could not build the digest.</p>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">
            No newsletter stories found in this window. Make sure your inbox has synced and contains newsletters.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {data.items.map((item, i) => (
            <li key={i} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <h3 className="font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.sources.map((s, j) => (
                  <Link
                    key={j}
                    to={`/inbox/${s.threadId}`}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200"
                    title={s.subject ?? ''}
                  >
                    {s.sender ?? 'source'}
                  </Link>
                ))}
                {item.sources.length > 1 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    {item.sources.length} sources
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
