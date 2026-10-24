/** @type {import('next').NextConfig} */
const nextConfig = {
    // Self-contained server build for the Docker image.
    output:'standalone',
    reactStrictMode:false,
    // Excalidraw 0.18 ships ESM-only; this also makes next/jest transform
    // it instead of ignoring it like the rest of node_modules.
    transpilePackages: [
        '@excalidraw/excalidraw',
        'nanoid',
        'roughjs',
        'hachure-fill',
        'path-data-parser',
        'points-on-curve',
        'points-on-path',
        'fractional-indexing',
    ],
    images:{
        domains:['lh3.googleusercontent.com']
    },
    // Old misspelled route kept working for bookmarks and shared links.
    async redirects() {
        return [
            { source: '/wokspace/:path*', destination: '/workspace/:path*', permanent: true },
        ];
    },
};

export default nextConfig;
