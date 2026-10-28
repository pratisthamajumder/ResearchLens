import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth.js';
import { query } from '@/lib/db.js';
import RoleSelect from '@/components/RoleSelect.js';
import ReindexButton from '@/components/ReindexButton.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · ResearchLens' };

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'ADMIN') redirect('/papers?denied=1');

  const [users, audit] = await Promise.all([
    query(`SELECT user_id, name, email, role, total_searches, saved_searches, last_search_at
             FROM v_user_search_activity ORDER BY user_id`),
    query(`SELECT log_id, paper_id, action, old_title, new_title, changed_at
             FROM paper_audit_log ORDER BY log_id DESC LIMIT 25`),
  ]);

  return (
    <>
      <h1>Admin</h1>

      <h2>Vector index (Qdrant)</h2>
      <div className="card">
        <p className="muted small">
          Papers are indexed automatically when an admin adds or edits them. Use this after loading data directly
          with SQL, or if Qdrant was offline when papers were changed.
        </p>
        <ReindexButton />
      </div>

      <h2>Users &amp; roles</h2>
      <p className="muted small">From the <code>v_user_search_activity</code> view (password hashes are never selected).</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Searches</th><th>Saved</th><th>Last search</th><th>Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id}>
                <td>{u.user_id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.total_searches}</td>
                <td>{u.saved_searches}</td>
                <td className="small muted">{u.last_search_at ?? '—'}</td>
                <td><RoleSelect userId={u.user_id} role={u.role} disabled={u.user_id === user.user_id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Paper audit log</h2>
      <p className="muted small">Written only by the <code>trg_paper_after_*</code> triggers — the app never inserts here itself.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Paper</th><th>Action</th><th>Old title</th><th>New title</th><th>When</th></tr></thead>
          <tbody>
            {audit.length === 0 && <tr><td colSpan={6} className="muted">No changes recorded yet.</td></tr>}
            {audit.map((a) => (
              <tr key={a.log_id}>
                <td>{a.log_id}</td>
                <td>{a.paper_id}</td>
                <td><span className="chip">{a.action}</span></td>
                <td>{a.old_title ?? '—'}</td>
                <td>{a.new_title ?? '—'}</td>
                <td className="small muted">{a.changed_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
