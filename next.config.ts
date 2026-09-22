import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "@google-cloud/firestore",
    "google-gax",
    "@grpc/grpc-js",
  ],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
