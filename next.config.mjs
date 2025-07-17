/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
    return [
      {
        // This applies to all routes that start with `/api/`
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Credentials",
            value: "true", // <-- ADD THIS LINE
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "https://www.minpainghein.com", // IMPORTANT: Your frontend domain
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
