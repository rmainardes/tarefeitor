import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita colisão com Claude.md: o Next geraria CLAUDE.md/AGENTS.md na raiz.
  agentRules: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
