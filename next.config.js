/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfjs-dist ships a worker as a separate chunk; bundle it via the
  // Webpack config so react-pdf can load workers at runtime.
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;