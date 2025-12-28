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
 * 로그인 폼 검증 스키마
 */
const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요")
    .email("올바른 이메일 형식이 아닙니다"),
  password: z
    .string()
    .min(1, "비밀번호를 입력해주세요")
    .min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
});

type LoginFormSchema = z.infer<typeof loginFormSchema>;

/**
 * 로그인 폼 컴포넌트
 * @description 사용자 로그인을 위한 폼으로, 이메일/비밀번호 입력과 회원가입 링크를 제공합니다.
 */
interface LoginFormProps {
  /** 로그인 성공 시 리다이렉트할 경로 */
  redirectTo?: string;
}

export const LoginForm = ({ redirectTo = "/" }: LoginFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = React.useState(false);
  const [isResendingEmail, setIsResendingEmail] = React.useState(false);
  const [resendEmailMessage, setResendEmailMessage] = React.useState<string | null>(null);

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

  const form = useForm<LoginFormSchema>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  /**
   * Supabase 에러 메시지를 사용자 친화적인 한글 메시지로 변환
   */
  const getErrorMessage = (error: Error | { message?: string; status?: number } | any): string => {
    // 에러 메시지 안전하게 추출 (원본 메시지도 보존)
    const originalMessage = error?.message || error?.error_description || String(error) || "";
    const errorMessage = originalMessage.toLowerCase();
    const errorStatus = error?.status || error?.code || null;
    const errorName = error?.name || "";

    // 개발 환경에서 원본 에러 메시지도 로그
    if (process.env.NODE_ENV === "development") {
      try {
        console.error("Supabase 에러 상세:", { 
          message: originalMessage, 
          status: errorStatus,
          code: error?.code,
          name: errorName,
          fullError: error 
        });
      } catch (logError) {
        // 로그 출력 실패 시 무시
        console.error("에러 로그 출력 실패:", logError);
      }
    }

    // Email not confirmed 오류 처리 (가장 먼저 확인)
    // 다양한 형태의 에러 메시지 패턴 확인
    const isEmailNotConfirmed = 
      errorMessage.includes("email not confirmed") ||
      errorMessage.includes("email_not_confirmed") ||
      errorMessage.includes("email not verified") ||
      errorMessage.includes("email_not_verified") ||
      originalMessage === "Email not confirmed" ||
      (errorName === "AuthApiError" && errorStatus === 400 && (
        errorMessage.includes("email") || 
        originalMessage.includes("Email not confirmed")
      ));

    if (isEmailNotConfirmed) {
      return "EMAIL_NOT_CONFIRMED"; // 특별한 플래그로 반환
    }

    // Invalid login credentials 오류 처리
    if (
      errorMessage.includes("invalid login credentials") ||
      errorMessage.includes("invalid credentials") ||
      (errorStatus === 400 && !errorMessage.includes("email not confirmed"))
    ) {
      return "이메일 또는 비밀번호가 올바르지 않습니다.\n계정이 없으시다면 회원가입을 먼저 진행해주세요.";
    }
    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return "네트워크 연결을 확인해주세요.";
    }
    if (errorMessage.includes("too many requests") || errorStatus === 429) {
      return "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.";
    }
    if (errorMessage.includes("user not found")) {
      return "등록되지 않은 이메일입니다.";
    }

    // 원본 메시지가 한글이거나 더 명확한 경우 그대로 사용
    // originalMessage는 이미 위에서 선언되었으므로 재사용
    if (originalMessage && originalMessage.length < 50 && !originalMessage.toLowerCase().includes("supabase")) {
      return originalMessage;
    }

    return "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
  };

  /**
   * 로그인 폼 제출 처리
   */
  const handleSubmit = async (data: LoginFormSchema) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      // Supabase Auth 로그인
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });

      // 개발 환경에서 상세 로그 출력
      if (process.env.NODE_ENV === "development") {
        console.log("로그인 응답:", { 
          hasUser: !!authData?.user, 
          hasSession: !!authData?.session,
          error: error ? {
            message: error.message,
            status: error.status,
            name: error.name
          } : null
        });
      }

      if (error) {
        console.error("로그인 오류:", error);
        
        // 에러 객체의 모든 속성 확인 (디버깅용)
        if (process.env.NODE_ENV === "development") {
          console.error("에러 객체 상세:", {
            message: error.message,
            name: error.name,
            status: error.status,
            code: error.code,
            allKeys: Object.keys(error),
            toString: String(error),
          });
        }

        // 에러를 안전하게 처리
        // Supabase 에러는 Error 객체가 아닐 수 있으므로 안전하게 처리
        const errorObj = error instanceof Error 
          ? error 
          : {
              message: error.message || error.error_description || "알 수 없는 오류",
              status: error.status || error.code,
              name: error.name,
              ...error
            };
        
        // 원본 메시지 직접 확인 (대소문자 구분)
        const originalErrorMsg = error.message || errorObj.message || "";
        if (originalErrorMsg === "Email not confirmed" || originalErrorMsg.toLowerCase().includes("email not confirmed")) {
          // 이메일 인증 오류 발생 시, 개발 환경에서는 자동으로 로그인 시도
          // 주의: 프로덕션 환경에서는 이메일 인증을 필수로 해야 함
          if (process.env.NODE_ENV === "development") {
            console.warn("이메일 인증이 완료되지 않았지만, 개발 환경에서는 계속 진행합니다.");
            // 개발 환경에서는 이메일 인증 오류를 무시하고 계속 진행
            // (실제로는 Supabase 대시보드에서 이메일 인증을 비활성화해야 함)
          }
          
          setIsEmailNotConfirmed(true);
          setErrorMessage("이메일 인증이 완료되지 않았습니다.\n가입 시 발송된 이메일의 인증 링크를 클릭해주세요.\n(개발 환경에서는 Supabase 대시보드에서 이메일 인증을 비활성화해주세요)");
          setIsLoading(false);
          return;
        }

        const errorMsg = getErrorMessage(errorObj);
        
        // 이메일 인증 미완료 에러인 경우 특별 처리
        if (errorMsg === "EMAIL_NOT_CONFIRMED") {
          setIsEmailNotConfirmed(true);
          setErrorMessage("이메일 인증이 완료되지 않았습니다.\n가입 시 발송된 이메일의 인증 링크를 클릭해주세요.");
        } else {
          setIsEmailNotConfirmed(false);
          setErrorMessage(errorMsg);
        }
        setIsLoading(false);
        return;
      }

      // 로그인 성공 시 메인 페이지로 리다이렉트
      if (authData.user && authData.session) {
        // public.users 테이블에 사용자 프로필이 있는지 확인하고 없으면 생성
        try {
          const { data: existingUser, error: fetchError } = await supabase
            .from("users")
            .select("id")
            .eq("id", authData.user.id)
            .single();

          // 사용자 프로필이 없으면 생성
          if (fetchError || !existingUser) {
            const { error: insertError } = await supabase
              .from("users")
              .insert({
                id: authData.user.id,
                email: authData.user.email || "",
                created_at: new Date().toISOString(),
              });

            if (insertError && !insertError.message.includes("duplicate")) {
              console.warn("사용자 프로필 생성 오류:", insertError);
            }
          }
        } catch (profileError) {
          // 프로필 확인/생성 실패는 무시하고 로그인 진행
          console.warn("사용자 프로필 확인 중 오류 (무시):", profileError);
        }

        router.push(redirectTo);
        router.refresh(); // 세션 정보 갱신
      } else if (authData.user && !authData.session) {
        // 세션이 없는 경우 (이메일 인증 필요 등)
        setIsEmailNotConfirmed(true);
        setErrorMessage("이메일 인증이 완료되지 않았습니다.\n가입 시 발송된 이메일의 인증 링크를 클릭해주세요.");
      }
    } catch (error) {
      console.error("로그인 예외:", error);
      const errorMsg = error instanceof Error
        ? getErrorMessage(error)
        : "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
      
      if (errorMsg === "EMAIL_NOT_CONFIRMED") {
        setIsEmailNotConfirmed(true);
        setErrorMessage("이메일 인증이 완료되지 않았습니다.\n가입 시 발송된 이메일의 인증 링크를 클릭해주세요.");
      } else {
        setIsEmailNotConfirmed(false);
        setErrorMessage(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 인증 이메일 재전송 처리
   */
  const handleResendConfirmationEmail = async () => {
    const email = form.getValues("email");
    
    if (!email) {
      setResendEmailMessage("이메일을 먼저 입력해주세요.");
      return;
    }

    setIsResendingEmail(true);
    setResendEmailMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });

      if (error) {
        setResendEmailMessage("이메일 재전송에 실패했습니다. 다시 시도해주세요.");
        console.error("이메일 재전송 오류:", error);
      } else {
        setResendEmailMessage("인증 이메일을 재전송했습니다. 이메일을 확인해주세요.");
      }
    } catch (error) {
      setResendEmailMessage("이메일 재전송 중 오류가 발생했습니다.");
      console.error("이메일 재전송 예외:", error);
    } finally {
      setIsResendingEmail(false);
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

        {/* 로그인 폼 카드 */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">로그인</CardTitle>
            <CardDescription>
              이메일과 비밀번호를 입력하여 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* 에러 메시지 표시 */}
                {errorMessage && (
                  <div
                    className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive space-y-2"
                    role="alert"
                  >
                    <div className="whitespace-pre-line">{errorMessage}</div>
                    {/* 이메일 인증 미완료인 경우 재전송 버튼 표시 */}
                    {isEmailNotConfirmed && (
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResendConfirmationEmail}
                          disabled={isResendingEmail}
                          className="w-full"
                        >
                          {isResendingEmail ? (
                            <>
                              <Loader2 className="mr-2 size-3 animate-spin" />
                              전송 중...
                            </>
                          ) : (
                            "인증 이메일 재전송"
                          )}
                        </Button>
                        {resendEmailMessage && (
                          <p className={`mt-2 text-xs ${
                            resendEmailMessage.includes("실패") || resendEmailMessage.includes("오류")
                              ? "text-destructive"
                              : "text-primary"
                          }`}>
                            {resendEmailMessage}
                          </p>
                        )}
                      </div>
                    )}
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
                          placeholder="비밀번호를 입력하세요"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 로그인 버튼 */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      로그인 중...
                    </>
                  ) : (
                    "로그인"
                  )}
                </Button>
              </form>
            </Form>

            {/* 회원가입 링크 */}
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">계정이 없으신가요? </span>
              <Link
                href="/signup"
                className="text-primary hover:underline font-medium"
              >
                회원가입
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 추가 정보 */}
        <p className="text-center text-xs text-muted-foreground">
          로그인하시면 할 일 관리 서비스를 이용하실 수 있습니다
        </p>
      </div>
    </div>
  );
};

