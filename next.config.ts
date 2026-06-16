import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const connectorProxyTarget =
      process.env.CONNECTOR_PROXY_TARGET ?? "http://127.0.0.1:3000";
    return [
      {
        source: "/connector-api/:path*",
        destination: `${connectorProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
