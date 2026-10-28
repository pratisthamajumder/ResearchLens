import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth.js';
import { listPapers } from '@/lib/papers.js';
import PaperCard from '@/components/PaperCard.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Papers · ResearchLens' };

export default async function PapersPage({ searchParams }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/papers');
  const { denied, deleted } = await searchParams;
  const papers = await listPapers();

  // Group by publication year (the list is already newest first)
  const years = [];
  for (const p of papers) {
    const y = p.publication_year ?? 'Undated';
    if (!years.length || years.at(-1).year !== y) years.push({ year: y, papers: [] });
    years.at(-1).papers.push(p);
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Papers</h1>
          <p className="lede">{papers.length} papers from {years.length} years, newest first.</p>
        </div>
        {user.role === 'ADMIN' && <Link className="btn" href="/papers/new">Add a paper</Link>}
      </header>
      {denied && <div className="alert error">That page is for admins only.</div>}
      {deleted && <div className="alert ok">Paper deleted.</div>}

      <div className="legend" aria-label="Edge colour shows the research domain">
        <span className="d-cs">Computer Science</span>
        <span className="d-bio">Biomedical Science</span>
        <span className="d-phys">Physics</span>
      </div>

      {years.map((group) => (
        <section key={group.year} className="year-group">
          <h2 className="year">{group.year}</h2>
          <div className="entries">
            {group.papers.map((p) => <PaperCard key={p.paper_id} paper={p} showYear={false} />)}
          </div>
        </section>
      ))}
    </>
  );
}
