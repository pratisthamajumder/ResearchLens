import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm.js';

export const metadata = { title: 'Register · ResearchLens' };

export default function RegisterPage() {
  return <Suspense><AuthForm mode="register" /></Suspense>;
}
