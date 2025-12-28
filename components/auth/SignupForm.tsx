"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

/**
 * 회원가입 폼 검증 스키마
 */
const signupFormSchema = z
  .object({
    email: z
      .string()
      .min(1, "이메일을 입력해주세요")
      .email("올바른 이메일 형식이 아닙니다"),
    password: z
      .string()
      .min(1, "비밀번호를 입력해주세요")
      .min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
    confirmPassword: z
      .string()
      .min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type SignupFormSchema = z.infer<typeof signupFormSchema>;

/**
 * 회원가입 폼 컴포넌트
 * @description 사용자 회원가입을 위한 폼으로, 이메일/비밀번호 입력과 로그인 링크를 제공합니다.
 */
interface SignupFormProps {
  /** 회원가입 성공 시 리다이렉트할 경로 */
  redirectTo?: string;
}

export const SignupForm = ({ redirectTo = "/" }: SignupFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  /**
   * 로그인된 사용자 확인 및 리다이렉트
   */
  React.useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // 이미 로그인된 사용자는 메인 페이지로 리다이렉트
        router.push("/");
        router.refresh();
      }
    };

    checkAuth();
  }, [router]);

  const form = useForm<SignupFormSchema>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  /**
   * Supabase 에러 메시지를 사용자 친화적인 한글 메시지로 변환
   */
  const getErrorMessage = (error: Error | { message?: string; status?: number } | any): string => {
    // 에러 메시지 안전하게 추출
    const originalMessage = error?.message || error?.error_description || String(error) || "";
    const errorMessage = originalMessage.toLowerCase();
    const errorStatus = error?.status || error?.code || null;

    // 개발 환경에서 원본 에러 메시지도 로그
    if (process.env.NODE_ENV === "development") {
      console.error("회원가입 에러 상세:", {
        message: originalMessage,
        status: errorStatus,
        code: error?.code,
        name: error?.name,
        fullError: error,
      });
    }

    // 이미 등록된 이메일
    if (
      errorMessage.includes("user already registered") ||
      errorMessage.includes("already registered") ||
      errorStatus === 422
    ) {
      return "이미 등록된 이메일입니다. 로그인을 시도해주세요.";
    }

    // 잘못된 이메일 형식
    if (errorMessage.includes("invalid email") || errorMessage.includes("email format")) {
      return "올바른 이메일 형식이 아닙니다.";
    }

    // 비밀번호 관련 오류
    if (
      errorMessage.includes("password") ||
      errorMessage.includes("password too short") ||
      errorStatus === 400
    ) {
      return "비밀번호는 최소 6자 이상이어야 합니다.";
    }

    // 이메일 전송 제한
    if (errorMessage.includes("email rate limit") || errorStatus === 429) {
      return "이메일 전송 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.";
    }

    // 네트워크 오류
    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return "네트워크 연결을 확인해주세요.";
    }

    // 원본 메시지가 명확한 경우 그대로 사용
    if (originalMessage && originalMessage.length < 100 && !originalMessage.toLowerCase().includes("supabase")) {
      return originalMessage;
    }

    return "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.";
  };

  /**
   * 회원가입 폼 제출 처리
   */
  const handleSubmit = async (data: SignupFormSchema) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();

      // Supabase Auth 회원가입
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email_verified: true,
          },
        },
      });

      // 개발 환경에서 상세 로그
      if (process.env.NODE_ENV === "development") {
        console.log("회원가입 응답:", {
          hasUser: !!authData?.user,
          hasSession: !!authData?.session,
          error: error
            ? {
                message: error.message,
                status: error.status,
                name: error.name,
                code: error.code,
              }
            : null,
        });
      }

      if (error) {
        // 에러를 안전하게 처리
        const errorObj = error instanceof Error
          ? error
          : {
              message: error.message || error.error_description || "알 수 없는 오류",
              status: error.status || error.code,
              ...error,
            };
        setErrorMessage(getErrorMessage(errorObj));
        setIsLoading(false);
        return;
      }

      // 회원가입 성공 처리
      if (authData.user) {
        // public.users 테이블에 사용자 프로필 생성 (트리거가 작동하지 않는 경우 대비)
        try {
          const { error: profileError } = await supabase
            .from("users")
            .insert({
              id: authData.user.id,
              email: authData.user.email || data.email,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          // 이미 존재하는 경우는 무시 (트리거가 이미 생성했을 수 있음)
          if (profileError && !profileError.message.includes("duplicate")) {
            console.warn("사용자 프로필 생성 오류 (무시 가능):", profileError);
          }
        } catch (profileError) {
          // 프로필 생성 실패는 무시 (트리거가 처리했을 수 있음)
          console.warn("사용자 프로필 생성 중 오류 (무시 가능):", profileError);
        }

        // 이메일 확인이 필요한 경우 (세션이 없는 경우)
        if (authData.user.email && !authData.session) {
          // 이메일 인증이 필요한 경우, 자동으로 로그인 시도
          // 주의: Supabase 대시보드에서 "Enable email confirmations"를 비활성화해야 함
          try {
            // 회원가입 직후 로그인 시도 (이메일 인증 우회)
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email: data.email,
              password: data.password,
            });

            if (loginError) {
              // 로그인 실패 시 이메일 인증 필요 메시지 표시
              setSuccessMessage(
                "회원가입이 완료되었습니다! 이메일을 확인하여 계정을 활성화해주세요. 확인 링크가 전송되었습니다."
              );
              
              // 3초 후 로그인 페이지로 리다이렉트
              setTimeout(() => {
                router.push("/login");
              }, 3000);
            } else if (loginData.session) {
              // 로그인 성공 시 메인 페이지로 리다이렉트
              setSuccessMessage("회원가입이 완료되었습니다!");
              router.push(redirectTo);
              router.refresh();
            }
          } catch (loginErr) {
            // 로그인 시도 실패 시 이메일 인증 필요 메시지 표시
            setSuccessMessage(
              "회원가입이 완료되었습니다! 이메일을 확인하여 계정을 활성화해주세요. 확인 링크가 전송되었습니다."
            );
            
            setTimeout(() => {
              router.push("/login");
            }, 3000);
          }
        } else if (authData.session) {
          // 즉시 로그인된 경우 (이메일 확인 불필요)
          setSuccessMessage("회원가입이 완료되었습니다!");
          
          // 메인 페이지로 리다이렉트
          setTimeout(() => {
            router.push(redirectTo);
            router.refresh();
          }, 1000);
        }
      }
    } catch (error) {
      console.error("회원가입 예외:", error);
      const errorObj = error instanceof Error
        ? error
        : { message: String(error) || "알 수 없는 오류" };
      setErrorMessage(getErrorMessage(errorObj));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-8">
        {/* 서비스 로고 및 소개 */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="size-16 rounded-2xl bg-primary flex items-center justify-center">
              <CheckCircle2 className="size-8 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">AI 할 일 관리</h1>
            <p className="text-muted-foreground">
              자연어로 입력하면 AI가 할 일을 자동으로 정리해드립니다
            </p>
          </div>
        </div>

        {/* 회원가입 폼 카드 */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">회원가입</CardTitle>
            <CardDescription>
              이메일과 비밀번호를 입력하여 계정을 만드세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* 성공 메시지 표시 */}
                {successMessage && (
                  <div
                    className="rounded-md bg-primary/10 border border-primary/20 p-3 text-sm text-primary"
                    role="alert"
                  >
                    {successMessage}
                  </div>
                )}

                {/* 에러 메시지 표시 */}
                {errorMessage && (
                  <div
                    className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
                    role="alert"
                  >
                    {errorMessage}
                  </div>
                )}

                {/* 이메일 입력 필드 */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 비밀번호 입력 필드 */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="비밀번호를 입력하세요 (최소 6자)"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 비밀번호 확인 입력 필드 */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호 확인</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="비밀번호를 다시 입력하세요"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 회원가입 버튼 */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      가입 중...
                    </>
                  ) : (
                    "회원가입"
                  )}
                </Button>
              </form>
            </Form>

            {/* 로그인 링크 */}
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                로그인
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 추가 정보 */}
        <p className="text-center text-xs text-muted-foreground">
          회원가입하시면 AI 할 일 관리 서비스를 이용하실 수 있습니다
        </p>
      </div>
    </div>
  );
};

