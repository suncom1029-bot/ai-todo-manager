"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * 클라이언트 컴포넌트용 Supabase 클라이언트
 * @description 브라우저 환경에서 사용하는 Supabase 클라이언트를 생성합니다.
 */
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  // 환경 변수 존재 및 유효성 검증
  if (!supabaseUrl || supabaseUrl.length === 0) {
    console.error("NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.");
    throw new Error(
      "Supabase URL이 설정되지 않았습니다. 환경 변수를 확인해주세요."
    );
  }

  if (!supabaseAnonKey || supabaseAnonKey.length === 0) {
    console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.");
    throw new Error(
      "Supabase API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요."
    );
  }

  // URL 형식 검증
  try {
    new URL(supabaseUrl);
  } catch {
    console.error("잘못된 Supabase URL 형식:", supabaseUrl);
    throw new Error(
      `잘못된 Supabase URL 형식입니다: ${supabaseUrl.substring(0, 20)}...`
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey) as any;
};

