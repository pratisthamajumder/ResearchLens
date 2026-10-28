'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client.js';

export default function ReindexButton() {
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const refresh = () => api('/api/semantic/status').then(setStatus).catch(() => setStatus({ online: false }));
  useEffect(() => { refresh(); }, []);

  async function reindex() {
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await api('/api/semantic/reindex', { method: 'POST' });
      setMsg({ type: 'ok', text: `Re-indexed ${res.indexed} papers.` });
      refresh();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {status && (
        <p>
          Status: {status.online
            ? <><strong>online</strong> — {status.indexedPoints} vectors for {status.papersInMySQL} papers in MySQL
                {status.collectionExists ? '' : ' (collection not created yet)'}</>
            : <strong>offline</strong>}
          {status.error && <span className="muted small"> ({status.error})</span>}
        </p>
      )}
      {msg.text && <div className={`alert ${msg.type}`}>{msg.text}</div>}
      <button onClick={reindex} disabled={busy}>
        {busy ? 'Embedding papers… (first run downloads the model)' : 'Rebuild vector index'}
      </button>
    </>
  );
}
