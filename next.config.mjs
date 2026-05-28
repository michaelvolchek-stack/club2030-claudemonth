/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-day-picker v10 is ESM-only — must be transpiled for Next.js webpack
  transpilePackages: ['react-day-picker'],
};

export default nextConfig;
