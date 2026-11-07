import type { NextConfig } from "next";

const isStatic = process.env.HELIX_STATIC === "1";

const nextConfig: NextConfig = {
  ...(isStatic
    ? { output: "export" as const, basePath: process.env.NEXT_PUBLIC_BASE_PATH || "", trailingSlash: true }
    : {
        // ship recorded live sequences + Oriane asset ids with the serverless functions
        outputFileTracingIncludes: {
          "/api/niche": ["./data/**/*"],
          "/api/status": ["./data/**/*"],
        },
      }),
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
