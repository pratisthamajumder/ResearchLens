'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// The home page's question box: goes straight to search by meaning.
export default function HeroSearch({ loggedIn }) {
  const router = useRouter();
  const [text, setText] = useState('');

  function go(e) {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    const target = `/semantic?q=${encodeURIComponent(q)}`;
    router.push(loggedIn ? target : `/login?next=${encodeURIComponent(target)}`);
  }

  return (
    <form className="hero-search" onSubmit={go} role="search">
      <label htmlFor="hero-q" className="sr-only">Describe what you are looking for</label>
      <input
        id="hero-q"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. how do you search millions of embeddings quickly?"
        autoComplete="off"
      />
      <button type="submit">Find papers</button>
    </form>
  );
}
