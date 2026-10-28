'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Rail navigation; the page you are on gets the amber focus bar.
export default function NavLinks({ isAdmin }) {
  const path = usePathname();
  const links = [
    ['/papers', 'Papers'],
    ['/search', 'Search'],
    ['/semantic', 'Search by meaning'],
    ['/history', 'History and saved'],
    ...(isAdmin ? [['/admin', 'Admin']] : []),
  ];
  return (
    <nav className="nav" aria-label="Main">
      {links.map(([href, label]) => {
        const active = path === href || path.startsWith(href + '/');
        return (
          <Link key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
