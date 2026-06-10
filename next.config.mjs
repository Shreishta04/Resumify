/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse uses canvas which may not be available
      config.externals = config.externals || [];
      config.externals.push('canvas');
    }
    return config;
  },
};

export default nextConfig;
