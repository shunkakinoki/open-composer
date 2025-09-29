import { withMicrofrontends } from "@vercel/microfrontends/next/config";
import { withVercelToolbar } from '@vercel/toolbar/plugins/next';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withVercelToolbar()(
  withMicrofrontends(nextConfig, { debug: true }),
);
