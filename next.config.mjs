import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  transpilePackages: ['framer-motion'],
  experimental: {
    serverActions: {
      bodySizeLimit: '512mb',
    },
  },
};

export default withNextIntl(nextConfig);
