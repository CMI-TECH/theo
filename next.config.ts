import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling these packages — they must run as native
  // Node.js modules. Without this, @anthropic-ai/sdk breaks on Vercel because
  // webpack can't handle its internal streams/fetch implementation.
  serverExternalPackages: ["@anthropic-ai/sdk", "@supabase/supabase-js"],
};

export default nextConfig;
