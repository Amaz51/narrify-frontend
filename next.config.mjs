/** @type {import('next').NextConfig} */
const FASTAPI_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api$/, '');

const nextConfig = {
    reactStrictMode: false,
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
            },
        ],
    },
    // Proxy /api/* → FastAPI backend to avoid CORS in production
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${FASTAPI_BASE}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
