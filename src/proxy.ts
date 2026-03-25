import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/dashboard', '/create', '/audiobook', '/voices', '/settings', '/board', '/admin-portal'];
const AUTH_PAGES = ['/auth/login', '/auth/register'];

export function proxy(request: NextRequest) {
    const token = request.cookies.get('access_token')?.value;
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
    const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

    if (isProtected && !token) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAuthPage && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

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
