'use client';
import { useState } from 'react';
import { api } from '@/lib/client.js';

export default function RoleSelect({ userId, role, disabled }) {
  const [value, setValue] = useState(role);
  const [msg, setMsg] = useState('');

  async function change(e) {
    const next = e.target.value;
    setMsg('');
    try {
      await api(`/api/admin/users/${userId}`, { method: 'PATCH', body: { role: next } });
      setValue(next);
      setMsg('✓');
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <span className="row">
      <select value={value} onChange={change} disabled={disabled} style={{ width: 'auto' }}
        title={disabled ? 'You cannot change your own role' : ''}>
        <option value="STUDENT">STUDENT</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      {msg && <span className="small muted">{msg}</span>}
    </span>
  );
}
