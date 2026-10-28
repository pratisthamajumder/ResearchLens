import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth.js';
import { getMeta, getPaper } from '@/lib/papers.js';
import PaperForm from '@/components/PaperForm.js';

export const dynamic = 'force-dynamic';

export default async function EditPaperPage({ params }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/papers/${id}/edit`);
  if (user.role !== 'ADMIN') redirect('/papers?denied=1');
  const paperId = Number(id);
  if (!Number.isInteger(paperId) || paperId <= 0) notFound();
  const [paper, meta] = await Promise.all([getPaper(paperId), getMeta()]);
  if (!paper) notFound();
  return (
    <>
      <h1>Edit paper</h1>
      <PaperForm meta={meta} initial={paper} />
    </>
  );
}
