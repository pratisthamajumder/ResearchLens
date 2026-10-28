'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/client.js';
import PaperCard from './PaperCard.js';

const EXAMPLES = [
  'fast lookup of similar vectors',
  'teaching computers to understand text',
  'making database queries run faster using machine learning',
  'changing DNA precisely',
  'noise in quantum computers',
];

export default function SemanticClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [text, setText] = useState(params.get('q') ?? '');
  const [yearFrom, setYearFrom] = useState('');
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/semantic/status').then(setStatus).catch(() => setStatus({ online: false }));
    if (params.get('q')) run(params.get('q'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(q) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const data = await api('/api/semantic/search', {
        method: 'POST',
        body: { query: q, limit: 8, yearFrom: yearFrom || undefined },
      });
      setResult({ ...data, q });
      router.replace(`/semantic?q=${encodeURIComponent(q)}`, { scroll: false });
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    try {
      const res = await api('/api/saved-searches', { method: 'POST', body: { query: result.q, search_type: 'semantic' } });
      setNotice(res.alreadySaved ? 'Already saved.' : 'Saved. Find it under History & saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      {status && !status.online && (
        <div className="alert warn">
          The vector database (Qdrant) is not reachable{status.error ? `: ${status.error}` : ''}. Start Qdrant and run
          <code> npm run index-papers</code>. Keyword search still works.
        </div>
      )}
      {status?.online && (
        <p className="small muted">
          Qdrant online · {status.indexedPoints} of {status.papersInMySQL} papers indexed
          {status.vectorSize ? ` · ${status.vectorSize}-dim vectors, ${status.distance} distance` : ''}
        </p>
      )}

      <form className="card" onSubmit={(e) => { e.preventDefault(); if (text.trim()) run(text.trim()); }}>
        <label htmlFor="sq">Describe what you are looking for, in your own words</label>
        <div className="row">
          <input id="sq" type="text" value={text} onChange={(e) => setText(e.target.value)} style={{ flex: 1, minWidth: 220 }}
            placeholder="e.g. how to search millions of embeddings quickly" />
          <input type="number" min={1900} max={2100} value={yearFrom} onChange={(e) => setYearFrom(e.target.value)}
            placeholder="from year" style={{ width: 120 }} aria-label="Published from year" />
          <button type="submit" disabled={busy}>{busy ? 'Thinking…' : 'Find papers'}</button>
        </div>
        <div className="small muted" style={{ marginTop: 8 }}>
          Try:{' '}
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="secondary" style={{ padding: '2px 8px', margin: '2px 4px 2px 0', fontSize: '0.8rem' }}
              onClick={() => { setText(ex); run(ex); }}>{ex}</button>
          ))}
        </div>
      </form>

      {error && <div className="alert error" style={{ marginTop: 14 }}>{error}</div>}
      {notice && <div className="alert ok" style={{ marginTop: 14 }}>{notice}</div>}

      {result && (
        <>
          <div className="spread" style={{ marginTop: 18 }}>
            <p className="muted" style={{ margin: 0 }}>
              Top {result.count} by cosine similarity — note that matches do not need to share any words with your query.
            </p>
            <button className="secondary" onClick={save}>☆ Save this search</button>
          </div>
          <div className="stack" style={{ marginTop: 10 }}>
            {result.results.map((p) => <PaperCard key={p.paper_id} paper={p} score={p.score} />)}
          </div>
        </>
      )}
    </>
  );
}
