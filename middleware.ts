import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 인증이 필요하지 않은 공개 경로 목록
 */
const publicPaths = ["/login", "/signup"];

/**
 * 인증이 필요한 보호된 경로 목록
 */
const protectedPaths = ["/dashboard"];

/**
 * Next.js 미들웨어
 * @description 인증 상태에 따라 사용자를 적절한 페이지로 리다이렉트합니다.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 환경 변수 확인
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 환경 변수가 없으면 에러 페이지로 리다이렉트하지 않고 기본 응답 반환
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables in middleware");
    // 환경 변수가 없어도 정적 파일이나 API 라우트는 통과시킴
    if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
      return NextResponse.next();
    }
    // 환경 변수 오류 페이지로 리다이렉트 (선택사항)
    return NextResponse.next();
  }

  // 미들웨어용 Supabase 클라이언트 생성
  let supabaseResponse = NextResponse.next({
    request,
  });

  let isAuthenticated = false;

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // Supabase 세션 확인
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Supabase session error in middleware:", error);
      // 에러가 발생해도 계속 진행 (인증되지 않은 것으로 처리)
    } else {
      isAuthenticated = !!session;
    }
  } catch (error) {
    console.error("Middleware error:", error);
    // 에러 발생 시 인증되지 않은 것으로 처리하고 계속 진행
    isAuthenticated = false;
  }

  // 메인 페이지(/) 접근 시 인증 상태에 따라 리다이렉트
  if (pathname === "/") {
    if (isAuthenticated) {
      // 로그인된 사용자는 메인 페이지 유지
      return supabaseResponse;
    } else {
      // 비로그인 사용자는 로그인 페이지로 리다이렉트
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 공개 경로는 항상 허용
  if (publicPaths.includes(pathname)) {
    if (isAuthenticated) {
      // 로그인된 사용자가 로그인/회원가입 페이지에 접근 시 메인 페이지로 리다이렉트
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  // 보호된 경로 접근 시 인증 확인
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    if (!isAuthenticated) {
      // 비로그인 사용자는 로그인 페이지로 리다이렉트
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
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

