"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
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

export const SignupForm = ({ redirectTo = "/dashboard" }: SignupFormProps) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const form = useForm<SignupFormSchema>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  /**
   * 회원가입 폼 제출 처리
   * TODO: Supabase Auth 연동 필요
   */
  const handleSubmit = async (data: SignupFormSchema) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // TODO: Supabase Auth 회원가입 로직 구현
      // const { data: authData, error } = await supabase.auth.signUp({
      //   email: data.email,
      //   password: data.password,
      // });
      
      // if (error) {
      //   setErrorMessage(error.message);
      //   return;
      // }
      
      // 회원가입 성공 시 메인 페이지로 리다이렉트
      // router.push(redirectTo);
      
      // 임시: 개발 중이므로 콘솔에 출력
      console.log("회원가입 시도:", { email: data.email });
      
      // 임시 지연 (실제 API 호출 시뮬레이션)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setSuccessMessage("회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.");
      
      // 성공 메시지 표시 후 로그인 페이지로 리다이렉트
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "회원가입 중 오류가 발생했습니다."
      );
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
                  {isLoading ? "가입 중..." : "회원가입"}
                </Button>
              </form>
            </Form>

            {/* 로그인 링크 */}
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
              <Link
                href="/"
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

