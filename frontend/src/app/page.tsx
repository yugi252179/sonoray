'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;

    if (token && user) {
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/employee/attendance');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <p className="text-xl">Redirecting...</p>
    </div>
  );
}
