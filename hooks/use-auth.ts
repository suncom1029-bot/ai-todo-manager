"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * 인증 상태 타입
 */
interface AuthState {
  /** 현재 로그인한 사용자 */
  user: User | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
}

/**
 * 인증 상태를 관리하는 커스텀 훅
 * @description Supabase 인증 상태를 실시간으로 관리하고, 상태 변화를 감지합니다.
 */
export const useAuth = () => {
  const router = useRouter();
  const [authState, setAuthState] = React.useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  /**
   * 사용자 정보 가져오기
   */
  const fetchUser = React.useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      const supabase = createClient();

      // 세션 확인
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setAuthState({
          user: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // 사용자 정보 가져오기
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setAuthState({
          user: null,
          isLoading: false,
          error: userError.message,
        });
        return;
      }

      setAuthState({
        user: user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setAuthState({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "인증 상태 확인 중 오류가 발생했습니다.",
      });
    }
  }, []);

  /**
   * 로그아웃 처리
   */
  const signOut = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // 상태 초기화
      setAuthState({
        user: null,
        isLoading: false,
        error: null,
      });

      // 로그인 페이지로 리다이렉트
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("로그아웃 오류:", error);
      throw error;
    }
  }, [router]);

  /**
   * 초기 로드 및 인증 상태 변화 감지
   */
  React.useEffect(() => {
    // 초기 사용자 정보 가져오기
    fetchUser();

    // Supabase 인증 상태 변화 감지
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      console.log("인증 상태 변화:", event, session?.user?.email);

      if (event === "SIGNED_IN" && session?.user) {
        setAuthState({
          user: session.user,
          isLoading: false,
          error: null,
        });
        router.refresh();
      } else if (event === "SIGNED_OUT") {
        setAuthState({
          user: null,
          isLoading: false,
          error: null,
        });
        router.refresh();
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        setAuthState({
          user: session.user,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser, router]);

  return {
    user: authState.user,
    isLoading: authState.isLoading,
    error: authState.error,
    signOut,
    refetch: fetchUser,
  };
};

