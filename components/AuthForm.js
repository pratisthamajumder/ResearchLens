'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/client.js';

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const params = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(isRegister ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body: form });
      const next = params.get('next');
      // full reload so the header picks up the new session
      window.location.href = next && next.startsWith('/') ? next : '/papers';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '20px auto' }}>
      <h1>{isRegister ? 'Create an account' : 'Log in'}</h1>
      {error && <div className="alert error">{error}</div>}
      <form onSubmit={submit}>
        {isRegister && (
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" value={form.name} onChange={set('name')} required minLength={2} maxLength={100} />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">
            Password {isRegister && <span className="hint">(8+ characters, with a letter and a number)</span>}
          </label>
          <input id="password" type="password" value={form.password} onChange={set('password')} required
            minLength={isRegister ? 8 : 1} autoComplete={isRegister ? 'new-password' : 'current-password'} />
        </div>
        <button type="submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Register' : 'Log in'}</button>
      </form>
      <p className="small muted" style={{ marginTop: 14 }}>
        {isRegister
          ? <>Already registered? <Link href="/login">Log in</Link></>
          : <>New here? <Link href="/register">Create a student account</Link></>}
      </p>
      {!isRegister && (
        <p className="small muted">
          Demo accounts: <code>shwetha@example.com</code> / <code>Admin@123</code> (admin),{' '}
          <code>arjun@example.com</code> / <code>Student@123</code> (student)
        </p>
      )}
    </div>
  );
}
