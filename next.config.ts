import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 既存の lint エラーが解消するまでの暫定対応。lint は `pnpm lint` で別途確認する
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
