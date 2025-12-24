"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/**
 * 헤더 컴포넌트
 * @description 상단 헤더로 서비스 로고, 사용자 정보, 로그아웃 버튼을 표시합니다.
 */
interface HeaderProps {
  /** 현재 로그인한 사용자 이메일 */
  userEmail?: string;
  /** 로그아웃 핸들러 */
  onLogout?: () => void;
}

export const Header = ({ userEmail = "user@example.com", onLogout }: HeaderProps) => {
  /**
   * 로그아웃 처리
   * TODO: Supabase Auth 로그아웃 로직 구현 필요
   */
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // TODO: Supabase Auth 로그아웃
      // await supabase.auth.signOut();
      // router.push('/');
      console.log("로그아웃");
      alert("로그아웃 기능은 Supabase Auth 연동 후 구현됩니다.");
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
              className="size-8"
              title="로그아웃"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

