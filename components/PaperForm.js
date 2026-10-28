'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client.js';

// Shared Add / Edit form. `initial` is null for Add.
export default function PaperForm({ meta, initial }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    publication_year: initial?.publication_year ?? '',
    journal: initial?.journal ?? '',
    doi: initial?.doi ?? '',
    pdf_url: initial?.pdf_url ?? '',
    abstract: initial?.abstract ?? '',
    authors: initial ? initial.authorList.map((a) => a.name).join('\n') : '',
    keywords: initial ? initial.keywordList.map((k) => k.keyword_name).join(', ') : '',
    topic_ids: initial ? initial.topicList.map((t) => t.topic_id) : [],
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleTopic = (id) =>
    setForm({
      ...form,
      topic_ids: form.topic_ids.includes(id) ? form.topic_ids.filter((t) => t !== id) : [...form.topic_ids, id],
    });
  const addAuthor = (e) => {
    const name = e.target.value;
    if (!name) return;
    const list = form.authors.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!list.includes(name)) setForm({ ...form, authors: [...list, name].join('\n') });
    e.target.value = '';
  };

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.topic_ids.length === 0) return setError('Choose at least one topic.');
    setBusy(true);
    const body = { ...form, authors: form.authors.split('\n') };
    try {
      const res = isEdit
        ? await api(`/api/papers/${initial.paper_id}`, { method: 'PUT', body })
        : await api('/api/papers', { method: 'POST', body });
      const qs = new URLSearchParams({ saved: '1' });
      if (res.warning) qs.set('warning', res.warning);
      window.location.href = `/papers/${res.paper_id}?${qs}`;
    } catch (err) {
      setError(err.message);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <form onSubmit={submit} className="card">
      {error && <div className="alert error">{error}</div>}

      <div className="field">
        <label htmlFor="title">Title *</label>
        <input id="title" type="text" value={form.title} onChange={set('title')} required maxLength={1000} />
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="year">Publication year <span className="hint">1900–2100</span></label>
          <input id="year" type="number" min={1900} max={2100} value={form.publication_year} onChange={set('publication_year')} />
        </div>
        <div className="field">
          <label htmlFor="journal">Journal / conference</label>
          <input id="journal" type="text" value={form.journal} onChange={set('journal')} maxLength={255} />
        </div>
        <div className="field">
          <label htmlFor="doi">DOI <span className="hint">e.g. 10.1000/xyz.2024.01 — must be unique</span></label>
          <input id="doi" type="text" value={form.doi} onChange={set('doi')} maxLength={255} />
        </div>
        <div className="field">
          <label htmlFor="pdf">PDF URL</label>
          <input id="pdf" type="url" value={form.pdf_url} onChange={set('pdf_url')} placeholder="https://…" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="abstract">Abstract <span className="hint">(also used to build the semantic embedding)</span></label>
        <textarea id="abstract" value={form.abstract} onChange={set('abstract')} />
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="authors">Authors * <span className="hint">one per line, in author order</span></label>
          <textarea id="authors" value={form.authors} onChange={set('authors')} style={{ minHeight: 90 }} required />
          <select onChange={addAuthor} defaultValue="" style={{ marginTop: 6 }}>
            <option value="">+ add an existing author…</option>
            {meta.authors.map((a) => <option key={a.author_id} value={a.name}>{a.name}</option>)}
          </select>
          <div className="hint">Names that are not in the database yet are created automatically.</div>
        </div>
        <div className="field">
          <label htmlFor="keywords">Keywords <span className="hint">comma separated</span></label>
          <textarea id="keywords" value={form.keywords} onChange={set('keywords')} style={{ minHeight: 90 }} />
        </div>
      </div>

      <div className="field">
        <label>Topics * <span className="hint">domain › subdomain › topic</span></label>
        <div className="checks">
          {meta.topics.map((t) => (
            <label key={t.topic_id}>
              <input type="checkbox" checked={form.topic_ids.includes(t.topic_id)} onChange={() => toggleTopic(t.topic_id)} />
              <span>{t.topic_name} <span className="hint">({t.domain_name} › {t.subdomain_name})</span></span>
            </label>
          ))}
        </div>
      </div>

      <div className="row">
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add paper'}</button>
        <Link className="btn secondary" href={isEdit ? `/papers/${initial.paper_id}` : '/papers'}>Cancel</Link>
      </div>
    </form>
  );
}
