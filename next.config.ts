import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set a unique value for every production build to prevent old clients
  // from submitting Server Action IDs to a newer deployment.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
  experimental: {
    serverActions: {
      // Ticket replies may include photos, videos, or documents. Application-level
      // validation below keeps the actual total to 40 MB per submission.
      bodySizeLimit: "42mb",
    },
  },
  // A stray lockfile higher up the drive can make Next mis-detect the
  // workspace root; pin it to this project.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
