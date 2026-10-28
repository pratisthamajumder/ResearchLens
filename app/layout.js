import './globals.css';
import Link from 'next/link';
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from 'next/font/google';
import { getSessionUser } from '@/lib/auth.js';
import LogoutButton from '@/components/LogoutButton.js';
import NavLinks from '@/components/NavLinks.js';
import Aperture from '@/components/Aperture.js';

// Display face with character for headings, and a typeface designed for
// legibility for reading - fitting for a product called "Lens".
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'ResearchLens',
  description: 'Bring research papers into focus: browse, search by keyword, or search by meaning.',
};

async function safeUser() {
  try {
    return await getSessionUser();
  } catch {
    return null; // DB down -> still render the page shell
  }
}

export default async function RootLayout({ children }) {
  const user = await safeUser();
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="shell">
          <aside className="rail">
            <Link href="/" className="brand">
              <Aperture size={30} />
              <span>ResearchLens</span>
            </Link>

            {user ? <NavLinks isAdmin={user.role === 'ADMIN'} /> : <div className="nav" />}

            <div className="rail-foot">
              {user ? (
                <>
                  <div className="who">
                    <span className="avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
                    <span>
                      <span className="who-name">{user.name}</span>
                      <span className={`role role-${user.role.toLowerCase()}`}>
                        {user.role === 'ADMIN' ? 'Admin' : 'Student'}
                      </span>
                    </span>
                  </div>
                  <LogoutButton />
                </>
              ) : (
                <div className="row">
                  <Link href="/login" className="btn secondary">Log in</Link>
                  <Link href="/register" className="btn">Register</Link>
                </div>
              )}
            </div>
          </aside>

          <div className="main">
            <main className="container">{children}</main>
            <footer className="footer">ResearchLens, a DBMS Level 3 project built on MySQL, Qdrant and Next.js</footer>
          </div>
        </div>
      </body>
    </html>
  );
}
