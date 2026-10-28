'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/client.js';
import { toStoredQuery } from '@/lib/searchQuery.js';
import PaperCard from './PaperCard.js';

const EMPTY = { q: '', type: 'keyword', domain: '', topic: '', yearFrom: '', yearTo: '' };

export default function SearchClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState(() => {
    const f = { ...EMPTY };
    for (const k of Object.keys(EMPTY)) if (params.get(k)) f[k] = params.get(k);
    return f;
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/meta').then(setMeta).catch((e) => setError(e.message));
  }, []);

  // Re-run automatically when opened from History / Saved searches
  useEffect(() => {
    if (params.get('run')) run(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function run(f) {
    setError('');
    setNotice('');
    setBusy(true);
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== ''));
    try {
      const data = await api(`/api/search?${qs}`);
      setResult({ ...data, ran: f });
      qs.delete('run');
      router.replace(`/search?${qs}`, { scroll: false });
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const f = result.ran;
    const search = { ...f, domain: f.domain || null, topic: f.topic || null, yearFrom: f.yearFrom || null, yearTo: f.yearTo || null };
    try {
      const res = await api('/api/saved-searches', {
        method: 'POST',
        body: { query: toStoredQuery(search), search_type: result.searchType },
      });
      setNotice(res.alreadySaved ? 'This search was already saved.' : 'Search saved. Find it under History & saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  const topics = meta?.topics.filter((t) => !form.domain || String(t.domain_id) === form.domain) ?? [];

  return (
    <>
      <form className="card" onSubmit={(e) => { e.preventDefault(); run(form); }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 3, minWidth: 220 }}>
            <label htmlFor="q">Search for</label>
            <input id="q" type="text" value={form.q} onChange={set('q')} placeholder="e.g. transformer, query optimization, CRISPR" />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label htmlFor="type">In</label>
            <select id="type" value={form.type} onChange={set('type')}>
              <option value="keyword">Keywords, title &amp; abstract</option>
              <option value="title">Title only</option>
              <option value="author">Author name</option>
            </select>
          </div>
          <button type="submit" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="domain">Domain</label>
            <select id="domain" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value, topic: '' })}>
              <option value="">Any domain</option>
              {meta?.domains.map((d) => <option key={d.domain_id} value={d.domain_id}>{d.domain_name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="topic">Topic</label>
            <select id="topic" value={form.topic} onChange={set('topic')}>
              <option value="">Any topic</option>
              {topics.map((t) => <option key={t.topic_id} value={t.topic_id}>{t.topic_name}</option>)}
            </select>
          </div>
          <div style={{ width: 110 }}>
            <label htmlFor="yf">Year from</label>
            <input id="yf" type="number" min={1900} max={2100} value={form.yearFrom} onChange={set('yearFrom')} />
          </div>
          <div style={{ width: 110 }}>
            <label htmlFor="yt">Year to</label>
            <input id="yt" type="number" min={1900} max={2100} value={form.yearTo} onChange={set('yearTo')} />
          </div>
          <button type="button" className="secondary" style={{ alignSelf: 'flex-end' }}
            onClick={() => { setForm(EMPTY); setResult(null); router.replace('/search'); }}>
            Clear
          </button>
        </div>
      </form>

      {error && <div className="alert error" style={{ marginTop: 14 }}>{error}</div>}
      {notice && <div className="alert ok" style={{ marginTop: 14 }}>{notice}</div>}

      {result && (
        <>
          <div className="spread" style={{ marginTop: 18 }}>
            <p className="muted" style={{ margin: 0 }}>
              {result.count} result{result.count === 1 ? '' : 's'} · recorded in your search history
            </p>
            <button className="secondary" onClick={save}>☆ Save this search</button>
          </div>
          <div className="stack" style={{ marginTop: 10 }}>
            {result.results.map((p) => (
              <PaperCard key={p.paper_id} paper={p}
                extra={p.relevance > 0 ? <div className="small muted">Full-text relevance: {Number(p.relevance).toFixed(2)}</div> : null} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
