import { withMicrofrontends } from "@vercel/microfrontends/next/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withMicrofrontends(nextConfig);
