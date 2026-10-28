import Link from 'next/link';

// Each research domain gets its own edge colour, so a list shows at a glance
// which field each paper belongs to.
const DOMAIN_CLASS = {
  'Computer Science': 'd-cs',
  'Biomedical Science': 'd-bio',
  Physics: 'd-phys',
};
function domainClass(domains) {
  const first = (domains || '').split(', ')[0];
  return DOMAIN_CLASS[first] || 'd-other';
}

// One paper in a list. Works in both server and client components.
// `score` (0-1 cosine similarity) draws the focus bar for meaning-based results.
export default function PaperCard({ paper, score, extra, showYear = true }) {
  const cited = paper.times_cited;
  return (
    <article className={`entry ${domainClass(paper.domains)}`}>
      <div className="entry-body">
        <h3 className="entry-title">
          <Link href={`/papers/${paper.paper_id}`}>{paper.title}</Link>
        </h3>
        <p className="entry-authors">{paper.authors || 'Unknown authors'}</p>
        <p className="entry-meta">
          {[paper.journal, showYear ? paper.publication_year : null].filter(Boolean).join(', ')}
          {cited != null && (
            <span className="cited">{cited === 0 ? 'Not cited yet' : `Cited ${cited} ${cited === 1 ? 'time' : 'times'}`}</span>
          )}
        </p>
        {paper.topics && (
          <ul className="topics">
            {paper.topics.split(', ').map((t) => <li key={t}>{t}</li>)}
          </ul>
        )}
        {extra}
      </div>
      {score != null && (
        <div className="focus" title={`Cosine similarity ${score.toFixed(3)}`}>
          <span className="focus-value">{Math.round(Math.max(0, score) * 100)}%</span>
          <span className="focus-track"><span className="focus-fill" style={{ width: `${Math.max(4, Math.min(100, score * 100))}%` }} /></span>
          <span className="focus-label">match</span>
        </div>
      )}
    </article>
  );
}
