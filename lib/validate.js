// Input validation done in the API layer BEFORE anything reaches MySQL.
// The database still has its own CHECK / UNIQUE / FK constraints and triggers
// as a second line of defence (see sql/01 and sql/04).
import { HttpError } from './errors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOI_RE = /^10\.\d{4,9}\/\S+$/i;

function str(v) {
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
}

export function validateRegistration(body) {
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (name.length < 2 || name.length > 100) throw new HttpError(400, 'Name must be 2-100 characters.');
  if (!EMAIL_RE.test(email) || email.length > 150) throw new HttpError(400, 'Enter a valid email address.');
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'Password must be at least 8 characters and contain a letter and a number.');
  }
  return { name, email, password };
}

export function validateLogin(body) {
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) throw new HttpError(400, 'Email and password are required.');
  return { email, password };
}

function cleanList(value) {
  if (Array.isArray(value)) return value.map(str).filter(Boolean);
  return str(value)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validatePaper(body) {
  const title = str(body.title);
  if (!title) throw new HttpError(400, 'Title is required.');
  if (title.length > 1000) throw new HttpError(400, 'Title is too long.');

  let publication_year = null;
  if (str(body.publication_year) !== '') {
    publication_year = Number(body.publication_year);
    if (!Number.isInteger(publication_year) || publication_year < 1900 || publication_year > 2100) {
      throw new HttpError(400, 'Publication year must be a whole number between 1900 and 2100.');
    }
  }

  let doi = str(body.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  if (doi && !DOI_RE.test(doi)) throw new HttpError(400, 'DOI must look like 10.1234/abc.123');
  doi = doi ? doi.toLowerCase() : null;

  let pdf_url = str(body.pdf_url) || null;
  if (pdf_url) {
    try {
      const u = new URL(pdf_url);
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch {
      throw new HttpError(400, 'PDF URL must start with http:// or https://');
    }
  }

  const abstract = str(body.abstract) || null;
  const journal = str(body.journal) || null;
  if (journal && journal.length > 255) throw new HttpError(400, 'Journal name is too long.');

  const topic_ids = [...new Set((Array.isArray(body.topic_ids) ? body.topic_ids : []).map(Number))];
  if (topic_ids.length === 0) throw new HttpError(400, 'Choose at least one topic.');
  if (topic_ids.some((t) => !Number.isInteger(t) || t <= 0)) throw new HttpError(400, 'Invalid topic.');

  // Authors are given by name, in author order. Unknown names are created.
  const authors = [...new Set(cleanList(body.authors))];
  if (authors.length === 0) throw new HttpError(400, 'Add at least one author.');
  if (authors.some((a) => a.length > 150)) throw new HttpError(400, 'Author name is too long.');

  const keywords = [...new Set(cleanList(body.keywords).map((k) => k.toLowerCase()))];
  if (keywords.some((k) => k.length > 100)) throw new HttpError(400, 'Keyword is too long.');

  return { title, publication_year, doi, pdf_url, abstract, journal, topic_ids, authors, keywords };
}

export const SEARCH_TYPES = ['keyword', 'title', 'author'];

export function validateSearch(params) {
  const q = str(params.get('q')).slice(0, 200);
  const type = SEARCH_TYPES.includes(params.get('type')) ? params.get('type') : 'keyword';
  const num = (key, min, max) => {
    const raw = str(params.get(key));
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `Invalid ${key}.`);
    return n;
  };
  const filters = {
    domain: num('domain', 1, Number.MAX_SAFE_INTEGER),
    topic: num('topic', 1, Number.MAX_SAFE_INTEGER),
    yearFrom: num('yearFrom', 1900, 2100),
    yearTo: num('yearTo', 1900, 2100),
  };
  const hasFilter = Object.values(filters).some((v) => v != null);
  if (!q && !hasFilter) throw new HttpError(400, 'Type something to search for, or pick a filter.');
  return { q, type, ...filters, hasFilter };
}
