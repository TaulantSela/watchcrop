/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing the heavy native `sharp` dep only in Node server code.
  serverExternalPackages: ["sharp", "postgres", "@electric-sql/pglite"],
};

export default nextConfig;
