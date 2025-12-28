"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, LogOut, Loader2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";

/**
 * 헤더 컴포넌트
 * @description 상단 헤더로 서비스 로고, 사용자 정보, 로그아웃 버튼을 표시합니다.
 */
export const Header = () => {
  const { user, isLoading, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // 다크모드 토글을 위한 마운트 확인 (hydration 오류 방지)
  React.useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 로그아웃 처리
   */
  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await signOut();
    } catch (error) {
      console.error("로그아웃 오류:", error);
      alert("로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  /**
   * 사용자 이메일에서 이니셜 추출
   */
  const getUserInitials = (email: string): string => {
    const parts = email.split("@");
    if (parts[0]) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return "U";
  };

  // 로딩 중이거나 사용자가 없으면 헤더를 표시하지 않음
  if (isLoading || !user) {
    return null;
  }

  const userEmail = user.email || "";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        {/* 서비스 로고 */}
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <CheckCircle2 className="size-5 text-primary-foreground" />
          </div>
          <span className="hidden sm:inline-block">AI 할 일 관리</span>
        </Link>

        {/* 사용자 정보 및 로그아웃 - 오른쪽 정렬 */}
        <div className="flex items-center gap-3 ml-auto">
          {/* 다크모드 토글 버튼 */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="size-8"
              title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          )}
          
          {/* 사용자 아이콘 */}
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getUserInitials(userEmail)}
            </AvatarFallback>
          </Avatar>
          
          {/* 사용자 정보 및 로그아웃 버튼 */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col text-right">
              <p className="text-sm font-medium leading-none">사용자</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="size-8"
              title="로그아웃"
            >
              {isLoggingOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

