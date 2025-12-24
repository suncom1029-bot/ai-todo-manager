import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 인증이 필요하지 않은 공개 경로 목록
 */
const publicPaths = ["/", "/login", "/signup"];

/**
 * 인증이 필요한 보호된 경로 목록
 */
const protectedPaths = ["/dashboard"];

/**
 * Next.js 미들웨어
 * @description 인증 상태에 따라 사용자를 적절한 페이지로 리다이렉트합니다.
 * TODO: Supabase Auth 연동 후 실제 인증 상태 확인 로직 구현 필요
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 항상 허용
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // TODO: Supabase Auth 세션 확인
  // const supabase = createClient(request);
  // const { data: { session } } = await supabase.auth.getSession();
  
  // 임시: 쿠키에서 인증 상태 확인 (실제 구현 시 Supabase 세션 사용)
  const authToken = request.cookies.get("auth-token");
  const isAuthenticated = !!authToken?.value;

  // 보호된 경로 접근 시 인증 확인
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    if (!isAuthenticated) {
      // 비로그인 사용자는 로그인 페이지로 리다이렉트
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 로그인된 사용자가 로그인/회원가입 페이지에 접근 시 대시보드로 리다이렉트
  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

/**
 * 미들웨어가 실행될 경로 설정
 */
export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청 경로에 매칭:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public 폴더의 파일들
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

