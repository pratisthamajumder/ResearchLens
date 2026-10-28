import { Suspense } from 'react';
import SearchClient from '@/components/SearchClient.js';

export const metadata = { title: 'Search · ResearchLens' };

export default function SearchPage() {
  return (
    <>
      <h1>Search papers</h1>
      <p className="muted">
        Keyword search uses MySQL&apos;s FULLTEXT index on title and abstract, plus the keyword table.
        Every search is saved to your history.
      </p>
      <Suspense><SearchClient /></Suspense>
    </>
  );
}
