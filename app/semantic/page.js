import { Suspense } from 'react';
import SemanticClient from '@/components/SemanticClient.js';

export const metadata = { title: 'Semantic search · ResearchLens' };

export default function SemanticPage() {
  return (
    <>
      <h1>Semantic search</h1>
      <p className="muted">
        Your text is turned into a 384-number vector by the all-MiniLM-L6-v2 model. Qdrant then returns the papers whose
        title + abstract vectors are closest (cosine similarity). Results are joined back to MySQL for authors and topics.
      </p>
      <Suspense><SemanticClient /></Suspense>
    </>
  );
}
