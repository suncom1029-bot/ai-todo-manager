import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, parseISO, isWithinInterval, subDays, subWeeks, getDay, isBefore, isAfter } from "date-fns";
import { createClient } from "@/lib/supabase/server";

/**
 * AI가 반환하는 요약 데이터 스키마
 */
const summarySchema = z.object({
  summary: z.string().describe("할 일 요약 (완료율 포함)"),
  urgentTasks: z.array(z.string()).describe("긴급한 할 일 목록 (제목만)"),
  insights: z.array(z.string()).describe("인사이트 목록 (시간대별 집중도, 마감일 분석 등)"),
  recommendations: z.array(z.string()).describe("실행 가능한 추천 사항"),
});

/**
 * 할 일 목록을 분석하여 요약과 인사이트를 제공하는 API
 * @description Gemini API를 사용하여 사용자의 할 일 목록을 분석하고 요약합니다.
 */
export async function POST(request: NextRequest) {
  try {
    // 환경변수 확인
    let apiKey = 
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    // API 키 정리
    if (apiKey) {
      // 1. 변수 이름이 포함되어 있는지 확인 및 제거 (Vercel 환경 변수 오류 대응)
      if (apiKey.includes("=")) {
        const parts = apiKey.split("=");
        if (parts.length > 1) {
          apiKey = parts.slice(1).join("=");
          console.log("⚠️ 환경 변수 값에서 변수 이름 부분 제거됨");
        }
      }
      
      // 2. 모든 공백, 줄바꿈, 탭 제거
      apiKey = apiKey.trim().replace(/[\r\n\t\s]/g, '');
      
      // 3. 영문자, 숫자, 하이픈, 언더스코어만 남기고 나머지 제거
      apiKey = apiKey.replace(/[^a-zA-Z0-9_-]/g, '');
    }
    
    if (!apiKey || !apiKey.startsWith("AIza")) {
      console.error("API 키 검증 실패:", {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiKeyPrefix: apiKey?.substring(0, 10) || "없음",
      });
      return NextResponse.json(
        { error: "API 키가 설정되지 않았거나 올바르지 않습니다." },
        { status: 500 }
      );
    }

    // 요청 본문 파싱
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "요청 본문이 올바른 JSON 형식이 아닙니다." },
        { status: 400 }
      );
    }

    const { period, userId } = body;

    // 입력 검증
    if (!period || (period !== "today" && period !== "week")) {
      return NextResponse.json(
        { error: "분석 기간이 올바르지 않습니다. 'today' 또는 'week'를 입력해주세요." },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 할 일 목록 조회
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    if (period === "today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      // 어제 데이터 (비교용)
      previousStartDate = startOfDay(subDays(now, 1));
      previousEndDate = endOfDay(subDays(now, 1));
    } else {
      // 이번주 (월요일 ~ 일요일)
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      // 지난주 데이터 (비교용)
      previousStartDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      previousEndDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    }

    // 해당 기간의 할 일 조회 (현재 기간 + 이전 기간)
    const { data: todos, error: todosError } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (todosError) {
      console.error("할 일 조회 오류:", todosError);
      return NextResponse.json(
        { error: "할 일 목록을 불러오는 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 타입 안전성을 위한 타입 정의
    type TodoRow = {
      id: string;
      user_id: string;
      title: string;
      description: string | null;
      priority: "high" | "medium" | "low";
      category: string;
      completed: boolean;
      due_date: string | null;
      created_at: string;
    };

    const todoList: TodoRow[] = (todos || []) as TodoRow[];

    // 기간 필터링 함수
    const filterTodosByPeriod = (todoList: TodoRow[], periodStart: Date, periodEnd: Date) => {
      return todoList.filter((todo) => {
        let targetDate: Date | null = null;
        
        // 마감일이 있으면 마감일 기준, 없으면 생성일 기준
        if (todo.due_date) {
          try {
            targetDate = parseISO(todo.due_date);
          } catch {
            if (todo.created_at) {
              try {
                targetDate = parseISO(todo.created_at);
              } catch {
                return false;
              }
            }
          }
        } else if (todo.created_at) {
          try {
            targetDate = parseISO(todo.created_at);
          } catch {
            return false;
          }
        }
        
        if (!targetDate) return false;
        return isWithinInterval(targetDate, { start: periodStart, end: periodEnd });
      });
    };

    // 현재 기간 할 일
    const filteredTodos = filterTodosByPeriod(todoList, startDate, endDate);
    // 이전 기간 할 일 (비교용)
    const previousTodos = filterTodosByPeriod(todoList, previousStartDate, previousEndDate);

    // 할 일이 없는 경우
    if (filteredTodos.length === 0) {
      return NextResponse.json({
        summary: period === "today" 
          ? "오늘 예정된 할 일이 없습니다." 
          : "이번 주 예정된 할 일이 없습니다.",
        urgentTasks: [],
        insights: [],
        recommendations: [],
      }, { status: 200 });
    }

    // 기본 통계 계산
    const totalTodos = filteredTodos.length;
    const completedTodos = filteredTodos.filter((t) => t.completed).length;
    const completionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

    // 이전 기간 통계 (비교용)
    const previousTotalTodos = previousTodos.length;
    const previousCompletedTodos = previousTodos.filter((t) => t.completed).length;
    const previousCompletionRate = previousTotalTodos > 0 ? (previousCompletedTodos / previousTotalTodos) * 100 : 0;
    const completionRateChange = completionRate - previousCompletionRate;

    // 우선순위별 완료 패턴 분석
    const priorityCompletion = {
      high: {
        total: filteredTodos.filter((t) => t.priority === "high").length,
        completed: filteredTodos.filter((t) => t.priority === "high" && t.completed).length,
      },
      medium: {
        total: filteredTodos.filter((t) => t.priority === "medium").length,
        completed: filteredTodos.filter((t) => t.priority === "medium" && t.completed).length,
      },
      low: {
        total: filteredTodos.filter((t) => t.priority === "low").length,
        completed: filteredTodos.filter((t) => t.priority === "low" && t.completed).length,
      },
    };

    // 우선순위 분포
    const priorityDistribution = {
      high: priorityCompletion.high.total,
      medium: priorityCompletion.medium.total,
      low: priorityCompletion.low.total,
    };

    // 카테고리 분포
    const categoryDistribution = {
      업무: filteredTodos.filter((t) => t.category === "업무").length,
      개인: filteredTodos.filter((t) => t.category === "개인").length,
      학습: filteredTodos.filter((t) => t.category === "학습").length,
      기타: filteredTodos.filter((t) => t.category === "기타").length,
    };

    // 카테고리별 완료 패턴
    const categoryCompletion = {
      업무: {
        total: categoryDistribution.업무,
        completed: filteredTodos.filter((t) => t.category === "업무" && t.completed).length,
      },
      개인: {
        total: categoryDistribution.개인,
        completed: filteredTodos.filter((t) => t.category === "개인" && t.completed).length,
      },
      학습: {
        total: categoryDistribution.학습,
        completed: filteredTodos.filter((t) => t.category === "학습" && t.completed).length,
      },
      기타: {
        total: categoryDistribution.기타,
        completed: filteredTodos.filter((t) => t.category === "기타" && t.completed).length,
      },
    };

    // 마감일 준수율 계산 (마감일이 지났는데 완료되지 않은 것)
    const todosWithDueDate = filteredTodos.filter((t) => t.due_date);
    const overdueTodos = todosWithDueDate.filter((todo) => {
      if (todo.completed) return false;
      try {
        const dueDate = parseISO(todo.due_date!);
        return isBefore(dueDate, now);
      } catch {
        return false;
      }
    });
    const onTimeTodos = todosWithDueDate.filter((todo) => {
      if (!todo.completed) return false;
      try {
        const dueDate = parseISO(todo.due_date!);
        return !isAfter(dueDate, now) || isBefore(dueDate, now);
      } catch {
        return false;
      }
    });
    const deadlineComplianceRate = todosWithDueDate.length > 0 
      ? (onTimeTodos.length / todosWithDueDate.length) * 100 
      : 0;

    // 연기된 할일 분석 (마감일이 지났는데 미완료)
    const postponedTasks = overdueTodos.map((t) => ({
      title: t.title,
      category: t.category,
      priority: t.priority,
      daysOverdue: Math.ceil((now.getTime() - parseISO(t.due_date!).getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // 요일별 생산성 분석 (완료된 할 일의 생성일 기준)
    const weekdayProductivity: { [key: string]: { total: number; completed: number } } = {
      "월요일": { total: 0, completed: 0 },
      "화요일": { total: 0, completed: 0 },
      "수요일": { total: 0, completed: 0 },
      "목요일": { total: 0, completed: 0 },
      "금요일": { total: 0, completed: 0 },
      "토요일": { total: 0, completed: 0 },
      "일요일": { total: 0, completed: 0 },
    };

    const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

    filteredTodos.forEach((todo) => {
      if (todo.created_at) {
        try {
          const createdDate = parseISO(todo.created_at);
          const weekday = weekdays[getDay(createdDate)];
          weekdayProductivity[weekday].total++;
          if (todo.completed) {
            weekdayProductivity[weekday].completed++;
          }
        } catch {
          // 무시
        }
      }
    });

    // 시간대별 집중도 분석 (마감일 기준)
    const timeSlots: { [key: string]: { total: number; completed: number } } = {
      "오전 (09:00-12:00)": { total: 0, completed: 0 },
      "오후 (12:00-18:00)": { total: 0, completed: 0 },
      "저녁 (18:00-21:00)": { total: 0, completed: 0 },
      "밤 (21:00-24:00)": { total: 0, completed: 0 },
    };

    filteredTodos.forEach((todo) => {
      if (todo.due_date) {
        try {
          const todoDate = parseISO(todo.due_date);
          const hour = todoDate.getHours();
          let timeSlot: keyof typeof timeSlots;
          if (hour >= 9 && hour < 12) timeSlot = "오전 (09:00-12:00)";
          else if (hour >= 12 && hour < 18) timeSlot = "오후 (12:00-18:00)";
          else if (hour >= 18 && hour < 21) timeSlot = "저녁 (18:00-21:00)";
          else timeSlot = "밤 (21:00-24:00)";
          
          timeSlots[timeSlot].total++;
          if (todo.completed) {
            timeSlots[timeSlot].completed++;
          }
        } catch {
          // 날짜 파싱 실패 시 무시
        }
      }
    });

    // 가장 생산적인 요일 찾기
    const mostProductiveWeekday = Object.entries(weekdayProductivity)
      .filter(([_, data]) => data.total > 0)
      .sort(([_, a], [__, b]) => {
        const rateA = a.total > 0 ? (a.completed / a.total) * 100 : 0;
        const rateB = b.total > 0 ? (b.completed / b.total) * 100 : 0;
        return rateB - rateA;
      })[0]?.[0] || null;

    // 가장 생산적인 시간대 찾기
    const mostProductiveTimeSlot = Object.entries(timeSlots)
      .filter(([_, data]) => data.total > 0)
      .sort(([_, a], [__, b]) => {
        const rateA = a.total > 0 ? (a.completed / a.total) * 100 : 0;
        const rateB = b.total > 0 ? (b.completed / b.total) * 100 : 0;
        return rateB - rateA;
      })[0]?.[0] || null;

    // 미루는 작업 유형 분석 (연기된 할일의 카테고리/우선순위 패턴)
    const postponedByCategory: { [key: string]: number } = {};
    const postponedByPriority: { [key: string]: number } = {};
    postponedTasks.forEach((task) => {
      postponedByCategory[task.category] = (postponedByCategory[task.category] || 0) + 1;
      postponedByPriority[task.priority] = (postponedByPriority[task.priority] || 0) + 1;
    });

    // 완료하기 쉬운 작업의 공통 특징 (완료율이 높은 카테고리/우선순위)
    const easiestCategory = Object.entries(categoryCompletion)
      .filter(([_, data]) => data.total > 0)
      .sort(([_, a], [__, b]) => {
        const rateA = (a.completed / a.total) * 100;
        const rateB = (b.completed / b.total) * 100;
        return rateB - rateA;
      })[0]?.[0] || null;

    const easiestPriority = Object.entries(priorityCompletion)
      .filter(([_, data]) => data.total > 0)
      .sort(([_, a], [__, b]) => {
        const rateA = (a.completed / a.total) * 100;
        const rateB = (b.completed / b.total) * 100;
        return rateB - rateA;
      })[0]?.[0] || null;

    // 긴급한 할 일 (high 우선순위이거나 마감일이 임박한 것)
    const urgentTasks = filteredTodos
      .filter((todo) => {
        if (todo.completed) return false;
        if (todo.priority === "high") return true;
        if (todo.due_date) {
          try {
            const todoDate = parseISO(todo.due_date);
            const daysUntilDue = Math.ceil((todoDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilDue <= 1; // 내일까지 마감
          } catch {
            return false;
          }
        }
        return false;
      })
      .map((todo) => todo.title);

    // AI 분석을 위한 데이터 준비
    const todosData = filteredTodos.map((todo) => ({
      title: todo.title,
      description: todo.description || "",
      priority: todo.priority,
      category: todo.category,
      completed: todo.completed,
      due_date: todo.due_date || null,
    }));

    // Gemini API 호출
    const googleAI = createGoogleGenerativeAI({
      apiKey: apiKey,
    });

    const periodLabel = period === "today" ? "오늘" : "이번 주";
    const previousPeriodLabel = period === "today" ? "어제" : "지난 주";
    const currentDate = format(now, "yyyy년 MM월 dd일");

    const { object: summary } = await generateObject({
      model: googleAI("gemini-2.5-flash"),
      schema: summarySchema,
      prompt: `당신은 사용자의 할 일 관리 패턴을 분석하는 전문 AI 어시스턴트입니다. 다음 데이터를 바탕으로 정교하고 실용적인 분석을 제공해주세요.

현재 날짜: ${currentDate}
분석 기간: ${periodLabel}
비교 기간: ${previousPeriodLabel}

=== 할 일 목록 ===
${JSON.stringify(todosData, null, 2)}

=== 핵심 통계 데이터 ===

**완료율 분석:**
- 현재 기간: 총 ${totalTodos}개 중 ${completedTodos}개 완료 (${completionRate.toFixed(1)}%)
- 이전 기간: 총 ${previousTotalTodos}개 중 ${previousCompletedTodos}개 완료 (${previousCompletionRate.toFixed(1)}%)
- 변화율: ${completionRateChange >= 0 ? '+' : ''}${completionRateChange.toFixed(1)}%p ${completionRateChange > 0 ? '(개선됨)' : completionRateChange < 0 ? '(감소)' : '(동일)'}

**우선순위별 완료 패턴:**
- 높음: ${priorityCompletion.high.completed}/${priorityCompletion.high.total}개 완료 (${priorityCompletion.high.total > 0 ? ((priorityCompletion.high.completed / priorityCompletion.high.total) * 100).toFixed(1) : 0}%)
- 중간: ${priorityCompletion.medium.completed}/${priorityCompletion.medium.total}개 완료 (${priorityCompletion.medium.total > 0 ? ((priorityCompletion.medium.completed / priorityCompletion.medium.total) * 100).toFixed(1) : 0}%)
- 낮음: ${priorityCompletion.low.completed}/${priorityCompletion.low.total}개 완료 (${priorityCompletion.low.total > 0 ? ((priorityCompletion.low.completed / priorityCompletion.low.total) * 100).toFixed(1) : 0}%)

**카테고리별 완료 패턴:**
- 업무: ${categoryCompletion.업무.completed}/${categoryCompletion.업무.total}개 완료 (${categoryCompletion.업무.total > 0 ? ((categoryCompletion.업무.completed / categoryCompletion.업무.total) * 100).toFixed(1) : 0}%)
- 개인: ${categoryCompletion.개인.completed}/${categoryCompletion.개인.total}개 완료 (${categoryCompletion.개인.total > 0 ? ((categoryCompletion.개인.completed / categoryCompletion.개인.total) * 100).toFixed(1) : 0}%)
- 학습: ${categoryCompletion.학습.completed}/${categoryCompletion.학습.total}개 완료 (${categoryCompletion.학습.total > 0 ? ((categoryCompletion.학습.completed / categoryCompletion.학습.total) * 100).toFixed(1) : 0}%)
- 기타: ${categoryCompletion.기타.completed}/${categoryCompletion.기타.total}개 완료 (${categoryCompletion.기타.total > 0 ? ((categoryCompletion.기타.completed / categoryCompletion.기타.total) * 100).toFixed(1) : 0}%)

**시간 관리 분석:**
- 마감일 준수율: ${deadlineComplianceRate.toFixed(1)}% (${onTimeTodos.length}/${todosWithDueDate.length}개)
- 연기된 할 일: ${postponedTasks.length}개
${postponedTasks.length > 0 ? `  - 연기 패턴: ${JSON.stringify(postponedByCategory, null, 2)} (카테고리별), ${JSON.stringify(postponedByPriority, null, 2)} (우선순위별)` : ''}

**시간대별 업무 집중도:**
${Object.entries(timeSlots).map(([slot, data]) => 
  `- ${slot}: ${data.total}개 (완료율 ${data.total > 0 ? ((data.completed / data.total) * 100).toFixed(1) : 0}%)`
).join('\n')}
${mostProductiveTimeSlot ? `- 가장 생산적인 시간대: ${mostProductiveTimeSlot}` : ''}

**요일별 생산성:**
${Object.entries(weekdayProductivity).map(([day, data]) => 
  `- ${day}: ${data.completed}/${data.total}개 완료 (${data.total > 0 ? ((data.completed / data.total) * 100).toFixed(1) : 0}%)`
).join('\n')}
${mostProductiveWeekday ? `- 가장 생산적인 요일: ${mostProductiveWeekday}` : ''}

**생산성 패턴:**
- 완료하기 쉬운 카테고리: ${easiestCategory || '데이터 부족'}
- 완료하기 쉬운 우선순위: ${easiestPriority || '데이터 부족'}
- 자주 미루는 카테고리: ${Object.keys(postponedByCategory).length > 0 ? Object.entries(postponedByCategory).sort(([_, a], [__, b]) => b - a)[0][0] : '없음'}
- 자주 미루는 우선순위: ${Object.keys(postponedByPriority).length > 0 ? Object.entries(postponedByPriority).sort(([_, a], [__, b]) => b - a)[0][0] : '없음'}

**긴급한 할 일:** ${urgentTasks.length}개
${urgentTasks.length > 0 ? urgentTasks.map((t, i) => `${i + 1}. ${t}`).join('\n') : '없음'}

=== 분석 요구사항 ===

**1. summary (요약):**
${period === "today" 
  ? "- 당일 집중도와 남은 할일 우선순위를 포함한 요약"
  : "- 주간 패턴 분석을 포함한 요약"}
- 완료율과 이전 기간 대비 개선도를 포함
- 자연스럽고 친근한 한국어 문체
- 예: "총 8개의 할 일 중 5개를 완료하셨어요! (62.5%) 어제보다 10%p 향상되었습니다."

**2. urgentTasks (긴급한 할 일):**
- 완료되지 않은 high 우선순위 할 일
- 마감일이 임박한 할 일 (내일까지)
- 제목만 간결하게 나열

**3. insights (인사이트):**
다음 항목들을 포함하되, 각각 1-2문장으로 자연스럽게 작성:
- **완료율 분석**: 우선순위별/카테고리별 완료 패턴, 이전 기간 대비 개선도
- **시간 관리 분석**: 마감일 준수율, 연기된 할일의 빈도 및 패턴
- **생산성 패턴**: 가장 생산적인 요일과 시간대, 자주 미루는 작업 유형, 완료하기 쉬운 작업의 특징
- **시간대별 집중도**: 업무가 집중된 시간대와 그 이유
${period === "today" 
  ? "- **당일 집중도**: 오늘의 할 일 분포와 우선순위"
  : "- **주간 패턴**: 이번 주의 전반적인 패턴과 특징"}

**4. recommendations (추천 사항):**
다음 유형의 구체적이고 실행 가능한 추천을 포함:
- **시간 관리 팁**: 마감일 준수율 개선, 연기된 할일 처리 방법
- **우선순위 조정**: 우선순위별 완료 패턴을 바탕으로 한 조정 제안
- **일정 재배치**: 시간대별/요일별 생산성 패턴을 활용한 일정 재배치
- **업무 분산 전략**: 업무 과부하를 줄이는 분산 전략
- 각 추천은 구체적이고 바로 실천 가능해야 함
- 예: "오후 시간대에 할 일이 집중되어 있네요. 생산성이 높은 ${mostProductiveTimeSlot || '오전'} 시간대에 중요한 업무를 배치해보세요."

=== 작성 규칙 ===

**문체:**
- 한국어로 자연스럽고 친근한 문체
- 사용자가 이해하기 쉽고 바로 실천할 수 있는 표현
- 격려하고 동기부여하는 긍정적 톤
- 전문 용어보다는 일상적 표현 사용

**긍정적 피드백:**
- 사용자가 잘하고 있는 부분을 강조 (예: "높은 우선순위 작업을 잘 처리하고 계세요!")
- 개선점을 격려하는 방식으로 제시 (예: "마감일 준수율을 조금만 높이면 더욱 좋을 것 같아요")
- 동기 부여 메시지 포함 (예: "꾸준한 노력이 보입니다. 계속 이렇게 하시면 목표 달성이 가까워질 거예요!")

**기간별 차별화:**
${period === "today" 
  ? "- 오늘의 요약: 당일 집중도와 남은 할일 우선순위에 집중\n- 오늘 남은 시간을 효율적으로 활용할 수 있는 구체적 제안"
  : "- 이번 주 요약: 주간 패턴 분석과 다음주 계획 제안에 집중\n- 주간 트렌드를 바탕으로 한 장기적 개선 방향 제시"}

**구성:**
- 각 인사이트와 추천은 독립적으로 이해 가능해야 함
- 구체적인 수치나 패턴을 언급하여 신뢰성 확보
- 실행 가능한 액션 아이템 중심으로 작성

=== 출력 형식 ===
{
  "summary": "완료율과 이전 기간 대비 개선도를 포함한 요약 (1-2문장)",
  "urgentTasks": ["긴급한 할 일 제목1", "긴급한 할 일 제목2"],
  "insights": [
    "완료율 분석 인사이트",
    "시간 관리 분석 인사이트",
    "생산성 패턴 인사이트",
    "시간대별 집중도 인사이트"
  ],
  "recommendations": [
    "구체적인 시간 관리 팁",
    "우선순위 조정 제안",
    "일정 재배치 제안",
    "업무 분산 전략"
  ]
}`,
    });

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error("=== AI 요약 오류 시작 ===");
    console.error("오류 타입:", typeof error);
    console.error("오류 객체:", error);

    if (error instanceof Error) {
      console.error("에러 메시지:", error.message);
      console.error("에러 이름:", error.name);
      console.error("에러 스택:", error.stack);

      // 429: Rate Limit 오류
      if (
        error.message.includes("429") ||
        error.message.includes("rate limit") ||
        error.message.includes("quota exceeded") ||
        (error as any).statusCode === 429
      ) {
        return NextResponse.json(
          { 
            error: "AI 서비스 사용 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.",
            code: "RATE_LIMIT_EXCEEDED"
          },
          { status: 429 }
        );
      }

      // API 키 오류
      if (
        error.message.includes("api key") ||
        error.message.includes("authentication") ||
        error.message.includes("401") ||
        error.message.includes("403")
      ) {
        return NextResponse.json(
          { error: "AI API 인증 오류가 발생했습니다. API 키를 확인해주세요." },
          { status: 500 }
        );
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: "할 일 분석 중 오류가 발생했습니다. 다시 시도해주세요.",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

