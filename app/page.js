import Link from 'next/link';
import { getSessionUser } from '@/lib/auth.js';
import { query } from '@/lib/db.js';
import Aperture from '@/components/Aperture.js';
import HeroSearch from '@/components/HeroSearch.js';

export const dynamic = 'force-dynamic';

async function loadStats() {
  try {
    const [[counts], domains] = await Promise.all([
      query(`SELECT (SELECT COUNT(*) FROM research_paper) AS papers,
                    (SELECT COUNT(*) FROM author)          AS authors,
                    (SELECT COUNT(*) FROM research_topic)  AS topics,
                    (SELECT COUNT(*) FROM citation)        AS citations`),
      query(`SELECT domain_name, SUM(paper_count) AS papers
               FROM v_topic_statistics GROUP BY domain_name ORDER BY papers DESC`),
    ]);
    return { counts, domains, error: null };
  } catch (err) {
    return { counts: null, domains: [], error: err.message };
  }
}

const DOMAIN_CLASS = { 'Computer Science': 'd-cs', 'Biomedical Science': 'd-bio', Physics: 'd-phys' };

export default async function Home() {
  const [user, stats] = await Promise.all([getSessionUser().catch(() => null), loadStats()]);
  const max = Math.max(1, ...stats.domains.map((d) => Number(d.papers)));

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <h1>What are you trying to find?</h1>
          <p className="lede">
            Describe it in your own words. ResearchLens compares the meaning of your question with every
            paper&apos;s abstract, so the right papers turn up even when they use different words.
          </p>
          <HeroSearch loggedIn={Boolean(user)} />
          {!user && (
            <p className="small muted">
              <Link href="/login">Log in</Link> or <Link href="/register">create a student account</Link> to search.
            </p>
          )}
        </div>
        <div className="hero-art">
          <Aperture size={260} animated />
        </div>
      </section>

      {stats.error && (
        <div className="alert error">
          Can&apos;t reach the database: {stats.error}. Check the DB settings in <code>.env.local</code> and that sql/01–04 have been run.
        </div>
      )}

      {stats.counts && (
        <section className="collection">
          <p className="collection-line">
            The collection holds <strong>{stats.counts.papers}</strong> papers by <strong>{stats.counts.authors}</strong> authors
            across <strong>{stats.counts.topics}</strong> topics, linked by <strong>{stats.counts.citations}</strong> citations.
          </p>

          <h2>Where the papers sit</h2>
          <ul className="domain-bars">
            {stats.domains.map((d) => (
              <li key={d.domain_name} className={DOMAIN_CLASS[d.domain_name] || 'd-other'}>
                <span className="domain-name">{d.domain_name}</span>
                <span className="domain-track">
                  <span className="domain-fill" style={{ width: `${(Number(d.papers) / max) * 100}%` }} />
                </span>
                <span className="domain-count">{Number(d.papers)}</span>
              </li>
            ))}
          </ul>
          <p className="small muted">Paper–topic links per domain, from the <code>v_topic_statistics</code> view.</p>
        </section>
      )}

      {user && (
        <section>
          <h2>Other ways in</h2>
          <ul className="ways">
            <li><Link href="/papers">Browse all papers</Link><span>By year, with authors, topics and citations.</span></li>
            <li><Link href="/search">Search by keyword</Link><span>Title, author or keyword, filtered by domain, topic and year.</span></li>
            <li><Link href="/history">Your history and saved searches</Link><span>Run any earlier search again.</span></li>
          </ul>
        </section>
      )}
    </>
  );
}
