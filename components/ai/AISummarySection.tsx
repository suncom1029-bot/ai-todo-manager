"use client";

import * as React from "react";
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Lightbulb, Target, TrendingUp, Calendar, Clock, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

/**
 * AI 요약 응답 타입
 */
interface AISummary {
  summary: string;
  urgentTasks: string[];
  insights: string[];
  recommendations: string[];
}

/**
 * 완료율 추출 함수
 * @description summary 텍스트에서 완료율을 추출합니다.
 */
function extractCompletionRate(summary: string): number {
  const match = summary.match(/(\d+\.?\d*)%/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * AI 요약 및 분석 섹션 컴포넌트
 * @description 사용자의 할 일 목록을 분석하여 요약과 인사이트를 제공합니다.
 */
export const AISummarySection = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<"today" | "week">("today");
  const [todaySummary, setTodaySummary] = React.useState<AISummary | null>(null);
  const [weekSummary, setWeekSummary] = React.useState<AISummary | null>(null);
  const [isLoadingToday, setIsLoadingToday] = React.useState(false);
  const [isLoadingWeek, setIsLoadingWeek] = React.useState(false);
  const [errorToday, setErrorToday] = React.useState<string | null>(null);
  const [errorWeek, setErrorWeek] = React.useState<string | null>(null);

  /**
   * AI 요약 생성
   */
  const handleGenerateSummary = async (period: "today" | "week") => {
    if (!user?.id) {
      return;
    }

    if (period === "today") {
      setIsLoadingToday(true);
      setErrorToday(null);
    } else {
      setIsLoadingWeek(true);
      setErrorWeek(null);
    }

    try {
      const response = await fetch("/api/ai/summarize-todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "알 수 없는 오류" }));
        throw new Error(errorData.error || "AI 요약 생성에 실패했습니다.");
      }

      const data: AISummary = await response.json();

      if (period === "today") {
        setTodaySummary(data);
      } else {
        setWeekSummary(data);
      }
    } catch (error) {
      console.error("AI 요약 생성 오류:", error);
      const errorMessage = error instanceof Error ? error.message : "AI 요약 생성 중 오류가 발생했습니다.";
      if (period === "today") {
        setErrorToday(errorMessage);
      } else {
        setErrorWeek(errorMessage);
      }
    } finally {
      if (period === "today") {
        setIsLoadingToday(false);
      } else {
        setIsLoadingWeek(false);
      }
    }
  };

  /**
   * 현재 탭의 요약 데이터 반환
   */
  const currentSummary = activeTab === "today" ? todaySummary : weekSummary;
  const isLoading = activeTab === "today" ? isLoadingToday : isLoadingWeek;
  const error = activeTab === "today" ? errorToday : errorWeek;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          AI 요약 및 분석
        </CardTitle>
        <CardDescription>
          할 일 목록을 분석하여 요약과 인사이트를 제공합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "today" | "week")}>
          <TabsList className="grid w-full grid-cols-2 mb-6 h-auto p-1 gap-2">
            <TabsTrigger 
              value="today" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              <Calendar className="size-4" />
              오늘의 요약
            </TabsTrigger>
            <TabsTrigger 
              value="week" 
              className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
            >
              <TrendingUp className="size-4" />
              이번 주 요약
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6 mt-4">
            {/* 초기 상태: AI 요약 보기 버튼 */}
            {!todaySummary && !isLoadingToday && !errorToday && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Calendar className="size-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">오늘의 요약</h3>
                <p className="text-sm text-muted-foreground mb-6">당일 집중 분석을 통해 오늘의 할 일을 효율적으로 관리하세요.</p>
                <Button
                  onClick={() => handleGenerateSummary("today")}
                  disabled={!user?.id}
                  className="gap-2"
                  size="lg"
                >
                  <Sparkles className="size-4" />
                  AI 요약 보기
                </Button>
              </div>
            )}

            {/* 로딩 상태 */}
            {isLoadingToday && (
              <div className="text-center py-12">
                <Loader2 className="size-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium mb-2">AI가 할 일을 분석하고 있습니다...</p>
                <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
              </div>
            )}

            {/* 오류 상태 */}
            {errorToday && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>분석 오류</AlertTitle>
                <AlertDescription className="mt-2">
                  {errorToday}
                </AlertDescription>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateSummary("today")}
                  disabled={isLoadingToday}
                  className="mt-4 gap-2"
                >
                  <RefreshCw className="size-3" />
                  재시도
                </Button>
              </Alert>
            )}

            {/* 오늘의 요약 결과 */}
            {todaySummary && !isLoadingToday && (
              <div className="space-y-6">
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Calendar className="size-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-600 dark:text-blue-400">오늘의 요약</span>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">당일 집중 분석 결과</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateSummary("today")}
                    disabled={isLoadingToday}
                    className="gap-2"
                  >
                    <RefreshCw className="size-3" />
                    다시 분석
                  </Button>
                </div>

                <Separator />

                {/* 완료율 시각화 */}
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">오늘의 완료율</p>
                          <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                            {extractCompletionRate(todaySummary.summary).toFixed(1)}%
                          </p>
                        </div>
                        <Target className="size-12 text-blue-400 dark:text-blue-500" />
                      </div>
                      <div className="h-3 w-full bg-blue-100 dark:bg-blue-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-500"
                          style={{ width: `${extractCompletionRate(todaySummary.summary)}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {todaySummary.summary}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 남은 할일 및 집중 작업 */}
                {todaySummary.urgentTasks.length > 0 && (
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="size-4 text-destructive" />
                        집중해야 할 작업
                      </CardTitle>
                      <CardDescription>
                        오늘 반드시 처리해야 하는 긴급한 할 일입니다.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {todaySummary.urgentTasks.map((task, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 rounded-lg bg-background border border-destructive/20"
                          >
                            <div className="flex-shrink-0 size-6 rounded-full bg-destructive/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-destructive">{index + 1}</span>
                            </div>
                            <span className="font-medium flex-1">{task}</span>
                            <Badge variant="destructive" className="flex-shrink-0">
                              긴급
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 인사이트 카드 */}
                {todaySummary.insights.length > 0 && (
                  <div>
                    <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <Lightbulb className="size-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-600 dark:text-blue-400">인사이트</span>
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {todaySummary.insights.map((insight, index) => {
                        const emojis = ["💡", "📊", "⏰", "🎯", "📈", "✨"];
                        return (
                          <Card key={index} className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10">
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl flex-shrink-0">{emojis[index % emojis.length]}</span>
                                <p className="text-sm leading-relaxed flex-1">{insight}</p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 추천 사항 */}
                {todaySummary.recommendations.length > 0 && (
                  <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="size-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-blue-600 dark:text-blue-400">실행 가능한 추천</span>
                      </CardTitle>
                      <CardDescription>
                        지금 바로 실천할 수 있는 구체적인 제안입니다.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {todaySummary.recommendations.map((recommendation, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 rounded-lg bg-background border border-blue-200 dark:border-blue-800"
                          >
                            <CheckCircle2 className="size-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm leading-relaxed flex-1">{recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="week" className="space-y-6 mt-4">
            {/* 초기 상태: AI 요약 보기 버튼 */}
            {!weekSummary && !isLoadingWeek && !errorWeek && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <TrendingUp className="size-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">이번 주 요약</h3>
                <p className="text-sm text-muted-foreground mb-6">주간 패턴 분석을 통해 생산성을 높이고 다음 주를 계획하세요.</p>
                <Button
                  onClick={() => handleGenerateSummary("week")}
                  disabled={!user?.id}
                  className="gap-2"
                  size="lg"
                >
                  <Sparkles className="size-4" />
                  AI 요약 보기
                </Button>
              </div>
            )}

            {/* 로딩 상태 */}
            {isLoadingWeek && (
              <div className="text-center py-12">
                <Loader2 className="size-12 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium mb-2">AI가 할 일을 분석하고 있습니다...</p>
                <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
              </div>
            )}

            {/* 오류 상태 */}
            {errorWeek && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>분석 오류</AlertTitle>
                <AlertDescription className="mt-2">
                  {errorWeek}
                </AlertDescription>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateSummary("week")}
                  disabled={isLoadingWeek}
                  className="mt-4 gap-2"
                >
                  <RefreshCw className="size-3" />
                  재시도
                </Button>
              </Alert>
            )}

            {/* 이번 주 요약 결과 */}
            {weekSummary && !isLoadingWeek && (
              <div className="space-y-6">
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <TrendingUp className="size-5 text-purple-600 dark:text-purple-400" />
                      <span className="text-purple-600 dark:text-purple-400">이번 주 요약</span>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">주간 패턴 분석 결과</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateSummary("week")}
                    disabled={isLoadingWeek}
                    className="gap-2"
                  >
                    <RefreshCw className="size-3" />
                    다시 분석
                  </Button>
                </div>

                <Separator />

                {/* 주간 완료율 */}
                <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">이번 주 완료율</p>
                          <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                            {extractCompletionRate(weekSummary.summary).toFixed(1)}%
                          </p>
                        </div>
                        <TrendingUp className="size-12 text-purple-400 dark:text-purple-500" />
                      </div>
                      <div className="h-3 w-full bg-purple-100 dark:bg-purple-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-600 dark:bg-purple-400 transition-all duration-500"
                          style={{ width: `${extractCompletionRate(weekSummary.summary)}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {weekSummary.summary}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 긴급한 할 일 */}
                {weekSummary.urgentTasks.length > 0 && (
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="size-4 text-destructive" />
                        이번 주 긴급한 할 일
                      </CardTitle>
                      <CardDescription>
                        우선적으로 처리해야 하는 작업들입니다.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {weekSummary.urgentTasks.map((task, index) => (
                          <Badge key={index} variant="destructive" className="text-sm py-1.5 px-3">
                            {task}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 인사이트 카드 */}
                {weekSummary.insights.length > 0 && (
                  <div>
                    <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <Lightbulb className="size-5 text-purple-600 dark:text-purple-400" />
                      <span className="text-purple-600 dark:text-purple-400">주간 인사이트</span>
                    </h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {weekSummary.insights.map((insight, index) => {
                        const emojis = ["💡", "📊", "⏰", "🎯", "📈", "✨", "🔍", "💪"];
                        return (
                          <Card key={index} className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/10">
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl flex-shrink-0">{emojis[index % emojis.length]}</span>
                                <p className="text-sm leading-relaxed flex-1">{insight}</p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 추천 사항 및 다음 주 계획 */}
                {weekSummary.recommendations.length > 0 && (
                  <div className="space-y-4">
                    <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Zap className="size-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-purple-600 dark:text-purple-400">실행 가능한 추천</span>
                        </CardTitle>
                        <CardDescription>
                          주간 패턴을 바탕으로 한 구체적인 개선 제안입니다.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {weekSummary.recommendations.map((recommendation, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-3 rounded-lg bg-background border border-purple-200 dark:border-purple-800"
                            >
                              <CheckCircle2 className="size-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                              <p className="text-sm leading-relaxed flex-1">{recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* 다음 주 계획 제안 영역 */}
                    <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="size-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-purple-600 dark:text-purple-400">다음 주 계획 제안</span>
                        </CardTitle>
                        <CardDescription>
                          이번 주 패턴을 바탕으로 한 다음 주 계획입니다.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p className="leading-relaxed">
                            이번 주 분석 결과를 바탕으로, 다음 주에는 더 효율적인 일정 관리가 가능할 것 같습니다.
                            주간 패턴을 활용하여 생산성을 높여보세요.
                          </p>
                          {weekSummary.recommendations.length > 0 && (
                            <div className="mt-4 p-3 rounded-lg bg-background/50 border border-purple-200 dark:border-purple-800">
                              <p className="font-medium text-foreground mb-2">💡 핵심 제안:</p>
                              <p className="leading-relaxed">
                                {weekSummary.recommendations[0]}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

