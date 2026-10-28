'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client.js';
import PaperCard from './PaperCard.js';

export default function SimilarPapers({ paperId }) {
  const [state, setState] = useState({ loading: true, results: [], error: '' });

  useEffect(() => {
    let cancelled = false;
    api(`/api/semantic/similar/${paperId}`)
      .then((d) => !cancelled && setState({ loading: false, results: d.results, error: '' }))
      .catch((e) => !cancelled && setState({ loading: false, results: [], error: e.message }));
    return () => { cancelled = true; };
  }, [paperId]);

  if (state.loading) return <p className="muted">Finding papers with similar meaning…</p>;
  if (state.error) return <div className="alert warn">{state.error}</div>;
  if (!state.results.length) return <p className="muted">No similar papers found.</p>;
  return (
    <>
      <p className="small muted">Score = cosine similarity between embeddings (1.0 = identical meaning).</p>
      <div className="stack">
        {state.results.map((r) => <PaperCard key={r.paper_id} paper={r} score={r.score} />)}
      </div>
    </>
  );
}
