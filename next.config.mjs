/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Smallest production deploy on VPS (Hetzner, etc.): `node .next/standalone/server.js` */
  output: "standalone",
};

export default nextConfig;
