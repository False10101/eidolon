"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth0();


  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.push('/home');
    } else {
      router.push('/landing');
    }
  }, [isAuthenticated, isLoading, router]);
}