import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      {
        source: "/share",
        headers: [
          { key: "Permissions-Policy", value: "camera=*, microphone=*, display-capture=*" },
        ],
      },
      {
        source: "/",
        headers: [
          { key: "Permissions-Policy", value: "camera=*, microphone=*, display-capture=*" },
        ],
      },
    ];
  },
};

export default nextConfig;
