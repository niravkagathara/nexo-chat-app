'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function GoogleCallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const userStr = params.get('user');
    const error = params.get('error');

    if (error) {
      router.push('/login?error=google_auth_failed');
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('nexo_token', token);
        localStorage.setItem('nexo_user', JSON.stringify(user));
        router.push('/chat');
      } catch {
        router.push('/login?error=invalid_response');
      }
    } else {
      router.push('/login');
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm font-medium">Signing you in with Google...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <GoogleCallbackHandler />
    </Suspense>
  );
}
