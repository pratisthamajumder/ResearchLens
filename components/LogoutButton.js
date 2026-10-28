'use client';
import { api } from '@/lib/client.js';

export default function LogoutButton() {
  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  }
  return (
    <button className="link" onClick={logout}>Log out</button>
  );
}
