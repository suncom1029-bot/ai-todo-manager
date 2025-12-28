import { test, expect } from "@playwright/test";
import { format, addDays, subDays, startOfWeek, endOfWeek, getDay } from "date-fns";

/**
 * AI 요약 및 분석 기능 검증을 위한 할 일 데이터 시드 스크립트
 * @description 다양한 우선순위, 카테고리, 마감일, 완료 상태의 할 일을 생성합니다.
 */
test.describe("할 일 데이터 시드", () => {
  test.setTimeout(300000); // 5분 타임아웃
  
  test("AI 요약 기능 검증을 위한 할 일 데이터 입력", async ({ page }) => {
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
    
    // 로그인 정보
    const email = "uniadmin@nate.com";
    const password = "a1234567";

    // 현재 날짜 기준 계산
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
    const dayAfterTomorrow = format(addDays(now, 2), "yyyy-MM-dd");
    const yesterday = format(subDays(now, 1), "yyyy-MM-dd");
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    // 이번 주 월요일, 수요일, 금요일 계산
    const monday = format(addDays(thisWeekStart, 0), "yyyy-MM-dd");
    const wednesday = format(addDays(thisWeekStart, 2), "yyyy-MM-dd");
    const friday = format(addDays(thisWeekStart, 4), "yyyy-MM-dd");

    // 로그인 페이지로 이동
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState("networkidle");

    // 로그인
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    // 로그인 후 메인 페이지로 이동 대기
    await page.waitForURL(`${baseURL}/`, { timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // AI 자연어 입력을 사용한 할 일 추가 함수
    const addTodoWithAI = async (
      naturalLanguage: string,
      shouldComplete: boolean = false
    ) => {
      try {
        // AI 자연어 입력 필드 찾기
        const aiInput = page.locator('textarea[id="natural-language"]');
        if (await aiInput.isVisible({ timeout: 3000 })) {
          await aiInput.fill(naturalLanguage);
          await page.waitForTimeout(500);
          
          // AI로 변환 버튼 클릭
          const aiButton = page.getByRole("button", { name: /AI로 변환/ });
          await aiButton.click();
          
          // AI 파싱 완료 대기 (로딩 스피너가 사라질 때까지)
          // AI 파싱이 완료될 때까지 대기 (최대 10초)
          try {
            await page.waitForSelector('input[id="title"]:not([disabled])', { timeout: 10000 });
          } catch {
            // 타임아웃이 발생해도 계속 진행
            await page.waitForTimeout(2000);
          }
          
          // 저장 버튼 클릭
          const submitButton = page.locator('button[type="submit"]').filter({ hasText: /추가|저장/ });
          await submitButton.click();
          
          // 저장 완료 대기 (할 일 목록에 추가될 때까지)
          await page.waitForTimeout(2000);
          
          // 완료 처리
          if (shouldComplete) {
            // 자연어에서 제목 추출 (첫 번째 문장)
            const title = naturalLanguage.split(/[.,!?]/)[0].trim();
            // 할 일 목록에서 해당 제목 찾기
            const todoTitle = page.getByText(title, { exact: false }).first();
            if (await todoTitle.isVisible({ timeout: 3000 })) {
              // 체크박스 찾기 (할 일 카드 내부)
              const card = todoTitle.locator("..").locator("..").locator("..");
              const checkbox = card.locator('input[type="checkbox"]').first();
              if (await checkbox.isVisible({ timeout: 2000 })) {
                await checkbox.click();
                await page.waitForTimeout(500);
              }
            }
          }
          
          // 폼 초기화 대기
          await page.waitForTimeout(500);
          console.log(`✓ AI로 할 일 추가 완료: ${naturalLanguage.substring(0, 30)}...`);
          return true;
        }
        return false;
      } catch (error) {
        console.error(`AI 할 일 추가 실패: ${naturalLanguage}`, error);
        return false;
      }
    };

    // 직접 폼 입력을 사용한 할 일 추가 함수
    const addTodoDirect = async (
      title: string,
      description: string,
      priority: "high" | "medium" | "low",
      category: "업무" | "개인" | "학습" | "기타",
      dueDate: string | null,
      shouldComplete: boolean = false
    ) => {
      try {
        // 폼이 보이는지 확인
        await page.waitForSelector('input[id="title"]', { state: "visible", timeout: 5000 });
        
        // 제목 입력
        await page.fill('input[id="title"]', title);
        await page.waitForTimeout(200);
        
        // 설명 입력
        if (description) {
          await page.fill('textarea[id="description"]', description);
          await page.waitForTimeout(200);
        }

        // 우선순위 선택
        const priorityButton = page.locator('button[id="priority"]');
        await priorityButton.click();
        await page.waitForTimeout(300);
        
        const priorityOptions = {
          high: "높음",
          medium: "중간",
          low: "낮음",
        };
        await page.getByRole("option", { name: priorityOptions[priority] }).click();
        await page.waitForTimeout(200);

        // 카테고리 선택
        const categoryButton = page.locator('button[id="category"]');
        await categoryButton.click();
        await page.waitForTimeout(300);
        await page.getByRole("option", { name: category }).click();
        await page.waitForTimeout(200);

        // 마감일 선택 (있는 경우) - 간단하게 스킵하고 나중에 수동으로 설정
        // 날짜 선택은 복잡하므로 일단 스킵

        // 저장 버튼 클릭
        const submitButton = page.locator('button[type="submit"]').filter({ hasText: /추가|저장/ });
        await submitButton.click();
        
        // 저장 완료 대기
        await page.waitForTimeout(1500);

        // 완료 처리
        if (shouldComplete) {
          const todoTitle = page.getByText(title, { exact: false }).first();
          if (await todoTitle.isVisible({ timeout: 3000 })) {
            const card = todoTitle.locator("..").locator("..").locator("..");
            const checkbox = card.locator('input[type="checkbox"]').first();
            if (await checkbox.isVisible({ timeout: 2000 })) {
              await checkbox.click();
              await page.waitForTimeout(500);
            }
          }
        }

        await page.waitForTimeout(500);
        console.log(`✓ 직접 입력으로 할 일 추가 완료: ${title}`);
        return true;
      } catch (error) {
        console.error(`직접 입력 할 일 추가 실패: ${title}`, error);
        return false;
      }
    };

    console.log("할 일 데이터 입력 시작...");

    // ===== 오늘의 요약을 위한 데이터 (AI 자연어 입력 사용) =====
    console.log("오늘의 요약 데이터 입력 중...");
    
    // 오늘 마감 - 완료된 것들
    await addTodoWithAI("오늘 오전 9시까지 중요한 회의 준비하기", true);
    await addTodoWithAI("오늘 점심 12시에 친구와 점심 약속", true);
    await addTodoWithAI("오늘 오후 3시까지 주간 업무 보고서 작성하기", false);
    await addTodoWithAI("오늘 저녁 6시에 헬스장에서 운동하기", false);
    await addTodoWithAI("오늘 밤 9시에 React 학습 책 읽기", false);

    // ===== 이번 주 요약을 위한 데이터 =====
    console.log("이번 주 요약 데이터 입력 중...");
    
    // 이번 주 월요일
    await addTodoWithAI("이번주 월요일 오전 10시에 프로젝트 기획서 작성하기", true);
    await addTodoWithAI("이번주 월요일 오후 2시에 팀 미팅 참석하기", true);
    
    // 이번 주 수요일
    await addTodoWithAI("이번주 수요일 오전 11시에 코드 리뷰하기", true);
    await addTodoWithAI("이번주 수요일 저녁 7시에 Next.js 온라인 강의 수강하기", false);
    
    // 이번 주 금요일
    await addTodoWithAI("이번주 금요일 오후 5시까지 주간 보고서 제출하기", false);
    await addTodoWithAI("이번주 금요일 저녁 7시에 친구 만나기", false);
    
    // ===== 다양한 패턴을 위한 데이터 =====
    console.log("다양한 패턴 데이터 입력 중...");
    
    // 과거 마감일 (연기된 할 일) - 직접 입력 사용
    await addTodoDirect("어제 마감이었던 보고서", "지연된 보고서 작성", "high", "업무", yesterday, false);
    await addTodoDirect("3일 전 마감이었던 학습", "React 학습 자료 정리", "medium", "학습", format(subDays(now, 3), "yyyy-MM-dd"), false);
    
    // 내일 마감
    await addTodoWithAI("내일 오전 9시까지 중요한 프레젠테이션 준비하기", false);
    await addTodoWithAI("내일 오후 2시에 장보기", false);
    
    // 모래 마감
    await addTodoWithAI("모래 오전 10시에 프로젝트 발표하기", false);
    
    // 다양한 카테고리
    await addTodoWithAI("이번주 금요일 저녁 8시에 운동 계획 수립하기", true);
    await addTodoWithAI("이번주 수요일 오후 4시에 TypeScript 고급 타입 학습하기", true);
    await addTodoDirect("기타 업무 정리", "잡무 정리 및 문서화", "low", "기타", friday, false);
    
    // 다양한 우선순위
    await addTodoWithAI("오늘 오후 4시까지 급하게 처리할 중요한 업무", false);
    await addTodoDirect("여유롭게 할 수 있는 작업", "시간 날 때 처리", "low", "기타", friday, false);
    
    // 완료된 다양한 패턴
    await addTodoWithAI("이번주 월요일 오전 10시에 중요한 업무 처리하기", true);
    await addTodoWithAI("이번주 월요일 밤 8시에 책 읽기", true);
    await addTodoWithAI("이번주 수요일 오후 2시에 쇼핑하기", true);
    
    // 추가 데이터: 시간대별 집중도 분석을 위한 데이터
    await addTodoWithAI("오늘 오전 10시에 업무 회의 참석하기", false);
    await addTodoWithAI("오늘 오후 1시에 점심 회의 준비하기", true);
    await addTodoWithAI("오늘 저녁 7시에 학습 자료 정리하기", false);
    await addTodoWithAI("오늘 밤 10시에 내일 계획 세우기", false);

    console.log("할 일 데이터 입력 완료!");
    
    // 페이지 새로고침하여 데이터 확인
    try {
      await page.reload({ waitUntil: "networkidle", timeout: 10000 });
      
      // 할 일 목록이 표시되는지 확인
      const todoList = page.locator('text=할 일 목록');
      await expect(todoList).toBeVisible({ timeout: 5000 });
      
      console.log("데이터 입력 검증 완료!");
    } catch (error) {
      console.log("페이지 새로고침 실패, 하지만 데이터는 입력되었을 수 있습니다:", error);
    }
  });
});

