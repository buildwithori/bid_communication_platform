/** @type {import('next').NextConfig} */
const path = require("node:path");

const nextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  reactCompiler: true,
  typedRoutes: true,
};

module.exports = nextConfig;
