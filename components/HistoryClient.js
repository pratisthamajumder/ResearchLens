'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client.js';
import { describeQuery, rerunUrl } from '@/lib/searchQuery.js';

export default function HistoryClient() {
  const [history, setHistory] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [h, s] = await Promise.all([api('/api/history'), api('/api/saved-searches')]);
      setHistory(h.history);
      setSaved(s.saved);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function removeSaved(id) {
    try {
      await api(`/api/saved-searches/${id}`, { method: 'DELETE' });
      setSaved(saved.filter((s) => s.search_id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveFromHistory(h) {
    try {
      await api('/api/saved-searches', { method: 'POST', body: { query: h.query, search_type: h.search_type } });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function clearHistory() {
    if (!window.confirm('Clear your whole search history?')) return;
    try {
      await api('/api/history', { method: 'DELETE' });
      setHistory([]);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <div className="alert error">{error}</div>;
  if (!history || !saved) return <p className="muted">Loading…</p>;

  return (
    <>
      <h2>Saved searches ({saved.length})</h2>
      {saved.length === 0 ? (
        <p className="muted">Nothing saved yet. Use “☆ Save this search” on a results page.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Query</th><th>Type</th><th>Saved on</th><th></th></tr></thead>
            <tbody>
              {saved.map((s) => (
                <tr key={s.search_id}>
                  <td>{describeQuery(s.query)}</td>
                  <td><span className="chip">{s.search_type}</span></td>
                  <td className="small muted">{s.created_at}</td>
                  <td className="row" style={{ justifyContent: 'flex-end' }}>
                    <Link className="btn" href={rerunUrl(s.query, s.search_type)}>Run again</Link>
                    <button className="secondary" onClick={() => removeSaved(s.search_id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="spread">
        <h2>Search history (last 50)</h2>
        {history.length > 0 && <button className="secondary" onClick={clearHistory}>Clear history</button>}
      </div>
      {history.length === 0 ? (
        <p className="muted">No searches yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Query</th><th>Type</th><th>Results</th><th></th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.history_id}>
                  <td className="small muted">{h.searched_at}</td>
                  <td>{describeQuery(h.query) || <span className="muted">(filters only)</span>}</td>
                  <td><span className="chip">{h.search_type}</span></td>
                  <td>{h.results_count}</td>
                  <td className="row" style={{ justifyContent: 'flex-end' }}>
                    <Link href={rerunUrl(h.query, h.search_type)}>Run again</Link>
                    <button className="secondary" style={{ padding: '3px 10px' }} onClick={() => saveFromHistory(h)}>☆ Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
