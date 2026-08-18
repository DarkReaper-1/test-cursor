import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@helix/shared",
    "@helix/rpg",
    "@helix/ai",
    "@helix/fitness",
    "@helix/design",
  ],
};

export default nextConfig;
