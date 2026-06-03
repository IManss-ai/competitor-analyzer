import { redirect } from 'next/navigation';

interface VerifyPageProps {
  searchParams: Promise<{ session_token?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const sessionToken = params.session_token;

  if (!sessionToken) {
    redirect('/auth/login?error=missing_token');
  }

  // Redirect to our callback route handler which will set the iron-session cookie
  redirect(`/api/auth/callback?session_token=${encodeURIComponent(sessionToken)}`);
}
