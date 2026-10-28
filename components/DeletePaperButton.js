'use client';
import { useState } from 'react';
import { api } from '@/lib/client.js';

export default function DeletePaperButton({ paperId, title }) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    // confirmation before an irreversible delete
    if (!window.confirm(`Delete "${title}"?\n\nIts author, topic, keyword and citation links will also be removed. This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/papers/${paperId}`, { method: 'DELETE' });
      window.location.href = '/papers?deleted=1';
    } catch (err) {
      alert(err.message);
      setBusy(false);
    }
  }

  return (
    <button className="danger" onClick={remove} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
  );
}
