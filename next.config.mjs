const nextConfig = {
  transpilePackages: ['framer-motion'],
  experimental: {
    serverActions: {
      bodySizeLimit: '512mb',
    },
  },
};

export default nextConfig;
