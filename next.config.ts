import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["typeorm", "mysql2"],
};

export default nextConfig;

