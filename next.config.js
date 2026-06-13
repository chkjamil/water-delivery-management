// @ts-check
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  serverExternalPackages: ["canvas", "sharp"],

  webpack: (config) => {
    config.infrastructureLogging = { level: "error" };
    return config;
  },

  // Experimental: faster cold starts and partial pre-rendering
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@supabase/supabase-js",
      "@supabase/ssr",
    ],
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

module.exports = withPWA(nextConfig);
