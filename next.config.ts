import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile higher up the drive can make Next mis-detect the
  // workspace root; pin it to this project.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
