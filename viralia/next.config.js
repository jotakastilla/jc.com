/** @type {import('next').NextConfig} */
const viraliaRuntimeFiles = [
  "./docs/viralia-estructura-a-revisar.txt",
  "./node_modules/ffmpeg-static/**",
  "./node_modules/ffprobe-static/**",
];

const nextConfig = {
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  outputFileTracingIncludes: {
    "/api/cron/viralia": viraliaRuntimeFiles,
    "/api/cron/viralia-prepublish": viraliaRuntimeFiles,
    "/api/cron/viralia-special": viraliaRuntimeFiles,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
};

module.exports = nextConfig;
