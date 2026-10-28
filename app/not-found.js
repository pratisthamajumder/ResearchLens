import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card">
      <h1>Not found</h1>
      <p>That page or paper does not exist.</p>
      <Link href="/papers">Back to papers</Link>
    </div>
  );
}
