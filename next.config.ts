import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Import only the Phosphor icons we use instead of the whole set.
    optimizePackageImports: ['@phosphor-icons/react'],
  },
};

export default nextConfig;
