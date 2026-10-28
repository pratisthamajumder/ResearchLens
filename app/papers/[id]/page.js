import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth.js';
import { getPaper } from '@/lib/papers.js';
import DeletePaperButton from '@/components/DeletePaperButton.js';
import SimilarPapers from '@/components/SimilarPapers.js';

export const dynamic = 'force-dynamic';

export default async function PaperDetails({ params, searchParams }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/papers/${id}`);
  const paperId = Number(id);
  if (!Number.isInteger(paperId) || paperId <= 0) notFound();
  const paper = await getPaper(paperId);
  if (!paper) notFound();
  const { saved, warning } = await searchParams;

  return (
    <>
      <p className="small"><Link href="/papers">← All papers</Link></p>
      {saved && <div className="alert ok">Paper saved.</div>}
      {warning && <div className="alert warn">{warning}</div>}

      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <h1 style={{ flex: 1 }}>{paper.title}</h1>
        {user.role === 'ADMIN' && (
          <div className="row">
            <Link className="btn secondary" href={`/papers/${paper.paper_id}/edit`}>Edit</Link>
            <DeletePaperButton paperId={paper.paper_id} title={paper.title} />
          </div>
        )}
      </div>

      <div className="card stack">
        <div>
          <strong>Authors: </strong>
          {paper.authorList.length
            ? paper.authorList.map((a, i) => (
                <span key={a.author_id}>
                  {i > 0 && ', '}{a.name}{a.affiliation && <span className="muted"> ({a.affiliation})</span>}
                </span>
              ))
            : <span className="muted">—</span>}
        </div>
        <div className="form-grid">
          <div><strong>Year:</strong> {paper.publication_year ?? '—'}</div>
          <div><strong>Journal / venue:</strong> {paper.journal ?? '—'}</div>
          <div><strong>DOI:</strong> {paper.doi ? <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">{paper.doi}</a> : '—'}</div>
          <div><strong>PDF:</strong> {paper.pdf_url ? <a href={paper.pdf_url} target="_blank" rel="noreferrer">Open link</a> : '—'}</div>
          <div><strong>Times cited (in this database):</strong> {paper.times_cited}</div>
          <div><strong>References made:</strong> {paper.references_made}</div>
        </div>
        <div>
          <strong>Topics: </strong>
          {paper.topicList.map((t) => (
            <span key={t.topic_id} className="chip">{t.domain_name} › {t.subdomain_name} › {t.topic_name}</span>
          ))}
        </div>
        {paper.keywordList.length > 0 && (
          <div>
            <strong>Keywords: </strong>
            {paper.keywordList.map((k) => <span key={k.keyword_id} className="chip">{k.keyword_name}</span>)}
          </div>
        )}
        <div>
          <strong>Abstract</strong>
          <p style={{ marginTop: 4 }}>{paper.abstract || <span className="muted">No abstract.</span>}</p>
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: 10 }}>
        <div>
          <h2>Cites ({paper.cites.length})</h2>
          {paper.cites.length === 0 && <p className="muted">No outgoing citations recorded.</p>}
          <ul>
            {paper.cites.map((c) => (
              <li key={c.paper_id}>
                <Link href={`/papers/${c.paper_id}`}>{c.title}</Link> ({c.publication_year})
                {c.citation_context && <div className="small muted">“{c.citation_context}”</div>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Cited by ({paper.citedBy.length})</h2>
          {paper.citedBy.length === 0 && <p className="muted">Not cited by any paper in the database.</p>}
          <ul>
            {paper.citedBy.map((c) => (
              <li key={c.paper_id}>
                <Link href={`/papers/${c.paper_id}`}>{c.title}</Link> ({c.publication_year})
                {c.citation_context && <div className="small muted">“{c.citation_context}”</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2>Similar papers <span className="hint">(vector search in Qdrant)</span></h2>
      <SimilarPapers paperId={paper.paper_id} />
    </>
  );
}
