"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Home() {
  const router = useRouter();


  useEffect(() => {
      const checkAuth = async () => {
          try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
                  method: 'GET',
                  credentials: 'include'
              });
              if (res.status === 200) {
                      router.push('/home');
              }
              else{
                router.push('/auth/login');
              }
              } catch (err) {
                  console.error('Auth check failed:', err);
              }
            };
    
            checkAuth();
        }, []);
}
