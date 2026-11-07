import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ship recorded live sequences + Oriane asset ids with the serverless functions
  outputFileTracingIncludes: {
    "/api/niche": ["./data/**/*"],
    "/api/status": ["./data/**/*"],
  },
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
