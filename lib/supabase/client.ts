"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * 클라이언트 컴포넌트용 Supabase 클라이언트
 * @description 브라우저 환경에서 사용하는 Supabase 클라이언트를 생성합니다.
 */
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase 환경 변수 누락:", {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      envKeys: Object.keys(process.env).filter((key) =>
        key.includes("SUPABASE")
      ),
    });
    throw new Error(
      "Missing Supabase environment variables. Please check your Vercel environment variables."
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey) as any;
};

