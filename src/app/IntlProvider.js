'use client';

import { useState, useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';

const MESSAGE_CACHE = { en: enMessages };

async function loadMessages(locale) {
  if (MESSAGE_CACHE[locale]) return MESSAGE_CACHE[locale];
  try {
    const mod = await import(`../../messages/${locale}.json`);
    MESSAGE_CACHE[locale] = mod.default;
    return mod.default;
  } catch {
    return enMessages;
  }
}

export default function IntlProvider({ children }) {
  const [locale, setLocale]     = useState('en');
  const [messages, setMessages] = useState(enMessages); // English ready immediately

  useEffect(() => {
    const stored = localStorage.getItem('locale') || 'en';
    if (stored !== 'en') {
      setLocale(stored);
      loadMessages(stored).then(setMessages);
    }

    const handler = (e) => {
      const next = e.detail || 'en';
      setLocale(next);
      loadMessages(next).then(setMessages);
    };
    window.addEventListener('locale-change', handler);
    return () => window.removeEventListener('locale-change', handler);
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Bangkok">
      {children}
    </NextIntlClientProvider>
  );
}
