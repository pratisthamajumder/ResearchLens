import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm.js';

export const metadata = { title: 'Log in · ResearchLens' };

export default function LoginPage() {
  return <Suspense><AuthForm mode="login" /></Suspense>;
}
