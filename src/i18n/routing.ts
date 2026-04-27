import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'th', 'zh', 'es', 'hi', 'id', 'pt', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'as-needed', // English URLs stay clean (no /en/ prefix)
});
