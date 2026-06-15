/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === "true";
const isCi = process.env.CI === "true";
const githubPagesBasePath = "/terra-viva-inventory-viewer";

const nextConfig = {
  reactStrictMode: true,
  distDir: isGithubPages && !isCi ? ".next-pages" : ".next",
  output: isGithubPages ? "export" : undefined,
  trailingSlash: isGithubPages ? true : undefined,
  images: {
    unoptimized: true
  },
  basePath: isGithubPages ? githubPagesBasePath : undefined,
  assetPrefix: isGithubPages ? `${githubPagesBasePath}/` : undefined
};

export default nextConfig;
