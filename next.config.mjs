/** @type {import('next').NextConfig} */
const nextConfig = {
    // Self-contained server build for the Docker image.
    output:'standalone',
    reactStrictMode:false,
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
