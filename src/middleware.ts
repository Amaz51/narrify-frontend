export { proxy as middleware } from './proxy';

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/create/:path*',
        '/audiobook/:path*',
        '/voices/:path*',
        '/settings/:path*',
        '/board/:path*',
        '/admin-portal',
        '/admin-portal/:path*',
        '/auth/:path*',
    ],
};
