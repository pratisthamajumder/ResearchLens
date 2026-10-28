import HistoryClient from '@/components/HistoryClient.js';

export const metadata = { title: 'History & saved searches · ResearchLens' };

export default function HistoryPage() {
  return (
    <>
      <h1>History &amp; saved searches</h1>
      <p className="muted">
        Stored in the <code>search_history</code> and <code>saved_search</code> tables. You only ever see your own rows —
        the API filters by the logged-in user&apos;s id on the server.
      </p>
      <HistoryClient />
    </>
  );
}
