const nextConfig = {
  transpilePackages: ['framer-motion'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10gb',
    },
  },
};

export default nextConfig;
