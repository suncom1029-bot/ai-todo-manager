import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { addDays, format, parseISO, isBefore, startOfDay } from "date-fns";

/**
 * AI가 반환하는 할 일 구조화 데이터 스키마
 */
const parsedTodoSchema = z.object({
  title: z.string().describe("할 일 제목"),
  due_date: z.string().describe("마감일 (YYYY-MM-DD 형식, 없으면 null)"),
  due_time: z.string().nullable().describe("마감 시간 (HH:mm 형식, 없으면 null)"),
  priority: z.enum(["high", "medium", "low"]).describe("우선순위 (high, medium, low)"),
  category: z.enum(["업무", "개인", "학습", "기타"]).describe("카테고리"),
  description: z.string().nullable().optional().describe("상세 설명 (선택사항)"),
});

/**
 * 입력 문자열 전처리 함수
 * @description 앞뒤 공백 제거, 연속된 공백 통합, 대소문자 정규화
 */
function preprocessInput(input: string): string {
  // 1. 앞뒤 공백 제거
  let processed = input.trim();
  
  // 2. 연속된 공백을 하나로 통합
  processed = processed.replace(/\s+/g, " ");
  
  // 3. 대소문자 정규화 (한글은 영향 없음, 영문자만 처리)
  // 첫 글자는 대문자로, 나머지는 소문자로 (단, 문장 중간의 대문자는 유지)
  // 한글 입력이므로 대소문자 정규화는 선택적으로 적용
  // processed = processed.charAt(0).toUpperCase() + processed.slice(1).toLowerCase();
  
  return processed;
}

/**
 * 입력 검증 함수
 * @description 빈 문자열, 길이, 특수문자/이모지 체크
 */
function validateInput(input: string): { isValid: boolean; error?: string } {
  // 1. 빈 문자열 체크
  if (!input || input.trim().length === 0) {
    return { isValid: false, error: "입력값이 비어있습니다. 할 일을 입력해주세요." };
  }

  // 2. 최소 길이 제한 (2자)
  if (input.trim().length < 2) {
    return { isValid: false, error: "입력값이 너무 짧습니다. 최소 2자 이상 입력해주세요." };
  }

  // 3. 최대 길이 제한 (500자)
  if (input.length > 500) {
    return { isValid: false, error: "입력값이 너무 깁니다. 최대 500자까지 입력 가능합니다." };
  }

  // 4. 특수 문자나 이모지 체크 (과도한 특수문자나 이모지만 있는 경우)
  // 한글, 영문, 숫자, 기본 구두점(.,!? 등)은 허용
  const validPattern = /^[\p{L}\p{N}\s.,!?;:()\-'"]+$/u;
  const specialCharOnlyPattern = /^[^\p{L}\p{N}]+$/u; // 문자나 숫자가 없는 경우
  
  if (specialCharOnlyPattern.test(input.trim())) {
    return { isValid: false, error: "입력값에 유효한 내용이 없습니다. 할 일을 명확하게 입력해주세요." };
  }

  return { isValid: true };
}

/**
 * 후처리 함수
 * @description AI 응답 데이터 검증 및 보정
 */
function postprocessTodoData(
  parsedTodo: z.infer<typeof parsedTodoSchema>,
  originalInput: string,
  currentDate: string
): { 
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "업무" | "개인" | "학습" | "기타";
  due_date: string | null;
} {
  // 1. 제목 자동 조정
  let title = parsedTodo.title || "";
  
  // 제목이 너무 짧은 경우 (2자 미만)
  if (title.trim().length < 2) {
    // 원본 입력에서 첫 20자를 제목으로 사용
    title = originalInput.trim().substring(0, 20);
  }
  
  // 제목이 너무 긴 경우 (100자 초과)
  if (title.length > 100) {
    title = title.substring(0, 97) + "...";
  }
  
  // 제목 앞뒤 공백 제거
  title = title.trim();

  // 2. 필수 필드 기본값 설정
  const priority = parsedTodo.priority || "medium";
  const category = parsedTodo.category || "기타";
  const description = parsedTodo.description || originalInput || "";

  // 3. 날짜 검증 및 보정
  let dueDate: string | null = null;
  
  if (parsedTodo.due_date) {
    try {
      const parsedDate = parseISO(parsedTodo.due_date);
      const today = startOfDay(new Date());
      
      // 과거 날짜인지 확인
      if (isBefore(parsedDate, today)) {
        // 과거 날짜인 경우 오늘 날짜로 변경
        console.warn(`과거 날짜 감지: ${parsedTodo.due_date} -> ${currentDate}로 변경`);
        dueDate = `${currentDate}T${parsedTodo.due_time || "09:00"}:00`;
      } else {
        // 정상적인 날짜인 경우
        const time = parsedTodo.due_time || "09:00";
        dueDate = `${parsedTodo.due_date}T${time}:00`;
      }
    } catch (error) {
      // 날짜 파싱 실패 시 null로 설정
      console.warn(`날짜 파싱 실패: ${parsedTodo.due_date}`, error);
      dueDate = null;
    }
  }

  return {
    title,
    description,
    priority,
    category,
    due_date: dueDate,
  };
}

/**
 * 자연어로 입력된 할 일을 구조화된 데이터로 변환하는 API
 * @description Gemini API를 사용하여 자연어 입력을 할 일 데이터로 변환합니다.
 */
export async function POST(request: NextRequest) {
  try {
    // 환경변수 확인 - Google AI Studio 문서에 따르면 여러 환경변수 이름을 지원
    // GOOGLE_GEMINI_API_KEY, GOOGLE_API_KEY, GEMINI_API_KEY 등을 확인
    let apiKey = 
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    // API 키 정리 (공백, 줄바꿈, 특수문자 제거)
    // Google API 키는 영문자와 숫자만 포함해야 함
    if (apiKey) {
      // 1. 변수 이름이 포함되어 있는지 확인 및 제거 (Vercel 환경 변수 오류 대응)
      // 예: "GOOGLE_GEMINI_API_KEY=AIza..." -> "AIza..."
      if (apiKey.includes("=")) {
        const parts = apiKey.split("=");
        if (parts.length > 1) {
          // "=" 뒤의 값만 사용
          apiKey = parts.slice(1).join("=");
          console.log("⚠️ 환경 변수 값에서 변수 이름 부분 제거됨");
        }
      }
      
      // 2. 모든 공백, 줄바꿈, 탭 제거
      apiKey = apiKey.trim().replace(/[\r\n\t\s]/g, '');
      
      // 3. 영문자, 숫자, 하이픈, 언더스코어만 남기고 나머지 제거
      apiKey = apiKey.replace(/[^a-zA-Z0-9_-]/g, '');
      
      console.log("API 키 정리 후:", {
        length: apiKey.length,
        prefix: apiKey.substring(0, 10),
        suffix: apiKey.substring(Math.max(0, apiKey.length - 5)),
      });
    }
    
    // 디버깅: API 키 확인 (보안을 위해 일부만 로그)
    console.log("API 키 확인:", {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 10) || "없음",
      apiKeySuffix: apiKey?.substring(Math.max(0, apiKey.length - 5)) || "없음",
      rawLength: process.env.GOOGLE_GEMINI_API_KEY?.length || 0,
    });
    
    if (!apiKey) {
      console.error("API 키 환경변수가 설정되지 않았습니다. 다음 변수명을 확인하세요:");
      console.error("- GOOGLE_GEMINI_API_KEY");
      console.error("- GOOGLE_API_KEY");
      console.error("- GEMINI_API_KEY");
      console.error("- GOOGLE_GENERATIVE_AI_API_KEY");
      return NextResponse.json(
        { error: "API 키 환경변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요." },
        { status: 500 }
      );
    }
    
    // Google API 키 형식 검증 (AIza로 시작해야 함)
    if (!apiKey.startsWith("AIza")) {
      console.error("API 키 형식이 올바르지 않습니다. Google API 키는 'AIza'로 시작해야 합니다.");
      console.error("현재 API 키 시작 부분:", apiKey.substring(0, 10));
      return NextResponse.json(
        { error: "API 키 형식이 올바르지 않습니다. Google AI Studio에서 올바른 API 키를 확인해주세요." },
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

    const { naturalLanguageInput } = body;

    // 입력 타입 검증
    if (!naturalLanguageInput || typeof naturalLanguageInput !== "string") {
      return NextResponse.json(
        { error: "자연어 입력이 필요합니다. 'naturalLanguageInput' 필드를 확인해주세요." },
        { status: 400 }
      );
    }

    // 입력 전처리
    const preprocessedInput = preprocessInput(naturalLanguageInput);

    // 입력 검증
    const validation = validateInput(preprocessedInput);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 현재 날짜/시간 정보 (AI가 상대적 날짜를 파싱할 수 있도록)
    const now = new Date();
    const currentDate = format(now, "yyyy-MM-dd"); // YYYY-MM-DD
    const currentTime = format(now, "HH:mm"); // HH:mm
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const currentWeekday = weekdays[now.getDay()];
    
    // 내일 날짜 계산
    const tomorrow = addDays(now, 1);
    const tomorrowDate = format(tomorrow, "yyyy-MM-dd");

    // Gemini API를 사용하여 자연어를 구조화된 데이터로 변환
    console.log("Gemini API 호출 시작...");
    
    // API 키 길이 최종 검증 (Google API 키는 보통 39자)
    if (apiKey.length < 20 || apiKey.length > 100) {
      console.error("API 키 길이가 유효하지 않습니다. 길이:", apiKey.length);
      return NextResponse.json(
        { error: "API 키 길이가 유효하지 않습니다. Google AI Studio에서 API 키를 다시 확인해주세요." },
        { status: 500 }
      );
    }
    
    console.log("API 키 검증 완료. 모델 호출 시작...");
    
    // @ai-sdk/google 사용법: createGoogleGenerativeAI로 provider 생성
    // gemini-1.5-flash는 v1beta에서 지원되지 않음
    // 최신 모델인 gemini-2.5-flash 사용 (v1beta에서 generateContent 지원)
    console.log("사용할 모델: gemini-2.5-flash");
    console.log("Google Generative AI Provider 생성 중...");
    
    // createGoogleGenerativeAI로 provider 생성 (API 키 명시적 전달)
    const googleAI = createGoogleGenerativeAI({
      apiKey: apiKey,
    });
    
    // 모래 날짜 계산 (현재 날짜 + 2일)
    const dayAfterTomorrow = addDays(now, 2);
    const dayAfterTomorrowDate = format(dayAfterTomorrow, "yyyy-MM-dd");
    
    // 이번주 금요일 계산 (가장 가까운 금요일)
    const currentDayOfWeek = now.getDay(); // 0=일요일, 5=금요일
    const daysUntilFriday = currentDayOfWeek <= 5 ? (5 - currentDayOfWeek) : (5 + 7 - currentDayOfWeek);
    const thisWeekFriday = addDays(now, daysUntilFriday);
    const thisWeekFridayDate = format(thisWeekFriday, "yyyy-MM-dd");
    
    // 다음주 월요일 계산
    const daysUntilNextMonday = currentDayOfWeek === 1 ? 7 : (8 - currentDayOfWeek);
    const nextMonday = addDays(now, daysUntilNextMonday);
    const nextMondayDate = format(nextMonday, "yyyy-MM-dd");

    // Gemini API 호출
    let parsedTodo: z.infer<typeof parsedTodoSchema>;
    try {
      const result = await generateObject({
        model: googleAI("gemini-2.5-flash"),
        schema: parsedTodoSchema,
        prompt: `다음 자연어 입력을 할 일 데이터로 JSON 형식으로 변환해주세요.

현재 날짜/시간 정보:
- 현재 날짜: ${currentYear}년 ${currentMonth}월 ${currentDay}일 ${currentWeekday} (${currentDate})
- 현재 시간: ${currentTime}
- 내일 날짜: ${format(tomorrow, "yyyy년 MM월 dd일")} (${tomorrowDate})
- 모래 날짜: ${format(dayAfterTomorrow, "yyyy년 MM월 dd일")} (${dayAfterTomorrowDate})
- 이번주 금요일: ${format(thisWeekFriday, "yyyy년 MM월 dd일")} (${thisWeekFridayDate})
- 다음주 월요일: ${format(nextMonday, "yyyy년 MM월 dd일")} (${nextMondayDate})

자연어 입력: "${preprocessedInput}"

=== 필수 변환 규칙 ===

1. **제목(title)**: 할 일의 핵심 내용을 간결하게 추출 (최대 100자)

2. **마감일(due_date) 처리 규칙** (반드시 준수):
   - "오늘" → ${currentDate} (현재 날짜)
   - "내일" → ${tomorrowDate} (현재 날짜 + 1일)
   - "모래" → ${dayAfterTomorrowDate} (현재 날짜 + 2일)
   - "이번주 금요일" → ${thisWeekFridayDate} (가장 가까운 금요일)
   - "다음주 월요일" → ${nextMondayDate} (다음주의 월요일)
   - "다음주 화요일", "다음주 수요일" 등도 현재 날짜 기준으로 정확히 계산
   - 날짜가 명시되지 않으면 null 반환
   - 형식: YYYY-MM-DD (예: ${currentDate})

3. **마감 시간(due_time) 처리 규칙** (반드시 준수):
   - "아침" → "09:00"
   - "점심" → "12:00"
   - "오후" → "14:00"
   - "저녁" → "18:00"
   - "밤" → "21:00"
   - "오전 9시", "오전 9:00" → "09:00"
   - "오후 3시", "오후 15:00" → "15:00"
   - "15:00", "3시" 등 구체적인 시간 표현은 그대로 사용
   - 시간이 명시되지 않으면 null 반환
   - 형식: HH:mm (예: 15:00)
   - 오전/오후를 24시간 형식으로 변환

4. **우선순위(priority) 키워드 규칙** (반드시 준수):
   - "high": 다음 키워드가 포함되면 "high"
     * "급하게", "중요한", "빨리", "꼭", "반드시"
   - "medium": 다음 키워드가 포함되거나 키워드가 없으면 "medium"
     * "보통", "적당히"
     * 키워드 없음
   - "low": 다음 키워드가 포함되면 "low"
     * "여유롭게", "천천히", "언젠가"

5. **카테고리(category) 분류 키워드 규칙** (반드시 준수):
   - "업무": "회의", "보고서", "프로젝트", "업무"
   - "개인": "쇼핑", "친구", "가족", "개인", "운동", "병원", "건강", "요가" (건강 관련도 개인으로 분류)
   - "학습": "공부", "책", "강의", "학습"
   - "기타": 위 키워드에 해당하지 않으면 "기타"

6. **설명(description)**: 원본 자연어 입력을 그대로 저장 (선택사항, null 가능)

=== 출력 예시 ===

입력: "내일 오후 3시까지 중요한 팀 회의 준비하기"
출력 JSON:
{
  "title": "팀 회의 준비",
  "due_date": "${tomorrowDate}",
  "due_time": "15:00",
  "priority": "high",
  "category": "업무",
  "description": "내일 오후 3시까지 중요한 팀 회의 준비하기"
}

입력: "이번주 금요일 저녁에 친구 만나기"
출력 JSON:
{
  "title": "친구 만나기",
  "due_date": "${thisWeekFridayDate}",
  "due_time": "18:00",
  "priority": "medium",
  "category": "개인",
  "description": "이번주 금요일 저녁에 친구 만나기"
}

입력: "모래 아침에 운동하기"
출력 JSON:
{
  "title": "운동하기",
  "due_date": "${dayAfterTomorrowDate}",
  "due_time": "09:00",
  "priority": "medium",
  "category": "개인",
  "description": "모래 아침에 운동하기"
}

=== 중요 주의사항 ===
- 반드시 JSON 형식으로 응답해야 합니다
- 날짜는 현재 날짜(${currentDate})를 기준으로 정확히 계산해야 합니다
- 시간 키워드("아침", "점심" 등)는 반드시 지정된 시간으로 변환해야 합니다
- 우선순위와 카테고리는 키워드 매칭 규칙을 정확히 따르세요
- 시간이 없으면 due_time은 null로 반환하되, 기본값을 설정하지 마세요`,
      });
      parsedTodo = result.object;
    } catch (aiError: any) {
      // AI API 호출 오류 처리
      console.error("AI API 호출 오류:", aiError);
      
      // 429: Rate Limit 오류
      if (
        aiError.message?.includes("429") ||
        aiError.message?.includes("rate limit") ||
        aiError.message?.includes("quota") ||
        aiError.statusCode === 429
      ) {
        return NextResponse.json(
          { 
            error: "AI 서비스 사용 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.",
            code: "RATE_LIMIT_EXCEEDED"
          },
          { status: 429 }
        );
      }

      // 기타 AI 처리 실패
      throw aiError; // 상위 catch 블록에서 처리
    }

    // 후처리: AI 응답 데이터 검증 및 보정
    const processedData = postprocessTodoData(parsedTodo, preprocessedInput, currentDate);

    return NextResponse.json(processedData, { status: 200 });
  } catch (error) {
    console.error("=== AI 할 일 파싱 오류 시작 ===");
    console.error("오류 타입:", typeof error);
    console.error("오류 객체:", error);
    
    // 상세한 에러 정보 로깅
    if (error instanceof Error) {
      console.error("에러 메시지:", error.message);
      console.error("에러 이름:", error.name);
      console.error("에러 스택:", error.stack);
      
      // AI SDK 특정 오류 확인
      if (error.cause) {
        console.error("에러 원인:", error.cause);
      }
      
      // 에러 객체의 모든 속성 출력
      console.error("에러 속성:", Object.keys(error));
      if ((error as any).response) {
        console.error("응답 오류:", (error as any).response);
      }
      if ((error as any).status) {
        console.error("상태 코드:", (error as any).status);
      }
      if ((error as any).statusText) {
        console.error("상태 텍스트:", (error as any).statusText);
      }
    } else {
      console.error("Error가 아닌 객체:", JSON.stringify(error, null, 2));
    }
    console.error("=== AI 할 일 파싱 오류 끝 ===");

    // AI SDK 오류 처리
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const errorString = JSON.stringify(error).toLowerCase();
      
      // API 키 오류 (다양한 패턴 확인)
      if (
        errorMessage.includes("api key") ||
        errorMessage.includes("authentication") ||
        errorMessage.includes("401") ||
        errorMessage.includes("403") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("invalid api key") ||
        errorMessage.includes("api key not found") ||
        errorString.includes("api key") ||
        errorString.includes("authentication")
      ) {
        console.error("API 키 인증 오류 감지 - 상세:", {
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        });
        return NextResponse.json(
          { error: "AI API 인증 오류가 발생했습니다. API 키를 확인해주세요." },
          { status: 500 }
        );
      }

      // 429: Rate Limit 오류 (이미 처리되었지만 이중 체크)
      if (
        error.message.includes("429") ||
        error.message.includes("rate limit") ||
        error.message.includes("quota exceeded") ||
        (error as any).statusCode === 429
      ) {
        console.error("Rate Limit 오류 상세:", {
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        });
        return NextResponse.json(
          { 
            error: "AI 서비스 사용 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.",
            code: "RATE_LIMIT_EXCEEDED"
          },
          { status: 429 }
        );
      }

      // 모델 오류 또는 기타 API 오류
      if (
        error.message.includes("model") ||
        error.message.includes("quota") ||
        error.message.includes("not found") ||
        error.message.includes("invalid")
      ) {
        console.error("모델/API 오류 상세:", {
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        });
        return NextResponse.json(
          { 
            error: "AI 서비스 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            code: "AI_SERVICE_ERROR",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
          },
          { status: 500 }
        );
      }

      // 네트워크 오류
      if (error.message.includes("network") || error.message.includes("fetch")) {
        return NextResponse.json(
          { error: "네트워크 연결을 확인해주세요." },
          { status: 503 }
        );
      }
    }

    // 기타 오류 - 개발 환경에서는 상세 정보 제공
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("기타 오류 상세:", {
      error,
      message: errorMessage,
      type: typeof error,
    });
    
    return NextResponse.json(
      { 
        error: "할 일을 파싱하는 중 오류가 발생했습니다. 다시 시도해주세요.",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

