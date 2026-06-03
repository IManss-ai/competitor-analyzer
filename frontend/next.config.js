/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from external sources if needed for logos etc.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
};

module.exports = nextConfig;
