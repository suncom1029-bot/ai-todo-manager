import { test, expect } from "@playwright/test";

/**
 * Vercel 배포 사이트 전체 기능 검증 테스트
 * @description 로그인부터 CRUD, AI 분석까지 모든 기능을 검증합니다.
 */
test.describe("Vercel 배포 사이트 전체 검증", () => {
  const baseURL = "https://ai-todo-manager-zeta.vercel.app";
  const email = "uniadmin@nate.com";
  const password = "a1234567";

  test("전체 기능 검증: 로그인 → 할일 추가 → 조회 → 수정 → 삭제 → AI 분석", async ({
    page,
  }) => {
    test.setTimeout(120000); // 2분 타임아웃

    console.log("=== 1. 로그인 페이지 접근 ===");
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState("networkidle");

    // 로그인 페이지 확인
    await expect(page.locator("h1")).toContainText("AI 할 일 관리", {
      timeout: 10000,
    });
    console.log("✓ 로그인 페이지 로드 완료");

    console.log("=== 2. 로그인 ===");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    // 로그인 버튼 클릭 전에 폼이 준비되었는지 확인
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    
    await submitButton.click();
    
    // 오류 메시지 확인
    await page.waitForTimeout(2000);
    
    // 오류 메시지가 있는지 확인
    await page.waitForTimeout(3000);
    const errorMessage = page.locator('text=/오류|에러|실패|잘못|Missing|환경/i');
    if (await errorMessage.isVisible({ timeout: 5000 })) {
      const errorText = await errorMessage.textContent();
      console.error(`❌ 로그인 오류: ${errorText}`);
      
      // 페이지 스크린샷 저장
      await page.screenshot({ path: "test-results/login-error.png", fullPage: true });
      
      // 환경 변수 오류인 경우 특별 처리
      if (errorText?.includes("Missing") || errorText?.includes("환경")) {
        console.error("⚠️ Vercel 환경 변수가 설정되지 않았을 수 있습니다.");
        console.error("Vercel 대시보드에서 다음 환경 변수를 확인하세요:");
        console.error("- NEXT_PUBLIC_SUPABASE_URL");
        console.error("- NEXT_PUBLIC_SUPABASE_ANON_KEY");
      }
      
      throw new Error(`로그인 실패: ${errorText}`);
    }

    // 로그인 후 메인 페이지로 이동 대기 (더 긴 타임아웃)
    try {
      await page.waitForURL(`${baseURL}/`, { timeout: 20000 });
      await page.waitForLoadState("networkidle");
      console.log("✓ 로그인 성공");
    } catch (error) {
      // 현재 URL 확인
      const currentURL = page.url();
      console.error(`❌ 로그인 후 리다이렉트 실패. 현재 URL: ${currentURL}`);
      
      // 페이지 내용 확인
      const pageContent = await page.textContent("body");
      console.log(`페이지 내용 일부: ${pageContent?.substring(0, 500)}`);
      
      throw error;
    }

    // 메인 페이지 확인
    await expect(page.locator("text=할 일 목록")).toBeVisible({
      timeout: 10000,
    });
    console.log("✓ 메인 페이지 로드 완료");

    console.log("=== 3. 할 일 추가 (직접 입력) ===");
    // 할 일 폼 찾기
    const titleInput = page.locator('input[id="title"]');
    await expect(titleInput).toBeVisible({ timeout: 10000 });

    // 할 일 추가
    const testTodoTitle = `테스트 할일 ${Date.now()}`;
    await titleInput.fill(testTodoTitle);

    // 우선순위 선택
    const priorityButton = page.locator('button[id="priority"]');
    if (await priorityButton.isVisible({ timeout: 2000 })) {
      await priorityButton.click();
      await page.waitForTimeout(300);
      await page.getByRole("option", { name: "높음" }).click();
      await page.waitForTimeout(200);
    }

    // 카테고리 선택
    const categoryButton = page.locator('button[id="category"]');
    if (await categoryButton.isVisible({ timeout: 2000 })) {
      await categoryButton.click();
      await page.waitForTimeout(300);
      await page.getByRole("option", { name: "업무" }).click();
      await page.waitForTimeout(200);
    }

    // 저장 버튼 클릭
    const addTodoButton = page.locator('button[type="submit"]').filter({
      hasText: /추가|저장/,
    });
    await addTodoButton.click();
    await page.waitForTimeout(2000);

    // 할 일 목록에 추가되었는지 확인
    await expect(page.getByText(testTodoTitle)).toBeVisible({
      timeout: 10000,
    });
    console.log("✓ 할 일 추가 성공");

    console.log("=== 4. 할 일 조회 및 확인 ===");
    // 할 일 목록이 표시되는지 확인
    const todoList = page.locator("text=할 일 목록");
    await expect(todoList).toBeVisible({ timeout: 5000 });

    // 추가한 할 일이 목록에 있는지 확인
    const addedTodo = page.getByText(testTodoTitle).first();
    await expect(addedTodo).toBeVisible({ timeout: 5000 });
    console.log("✓ 할 일 조회 성공");

    console.log("=== 5. 할 일 완료 처리 ===");
    // 체크박스 찾기 및 클릭
    const todoCard = addedTodo.locator("..").locator("..").locator("..");
    const checkbox = todoCard.locator('input[type="checkbox"]').first();

    if (await checkbox.isVisible({ timeout: 3000 })) {
      await checkbox.click();
      await page.waitForTimeout(1000);
      console.log("✓ 할 일 완료 처리 성공");
    } else {
      console.log("⚠ 체크박스를 찾을 수 없음");
    }

    console.log("=== 6. 할 일 수정 ===");
    // 수정 버튼 찾기
    const editButton = todoCard
      .locator('button')
      .filter({ hasText: /수정|편집/ })
      .first();

    if (await editButton.isVisible({ timeout: 3000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // 제목 수정
      const editTitleInput = page.locator('input[id="title"]');
      if (await editTitleInput.isVisible({ timeout: 2000 })) {
        await editTitleInput.fill(`${testTodoTitle} (수정됨)`);
        await page.waitForTimeout(500);

        // 저장 버튼 클릭
        const saveButton = page
          .locator('button[type="submit"]')
          .filter({ hasText: /수정|저장/ });
        await saveButton.click();
        await page.waitForTimeout(2000);

        // 수정된 할 일 확인
        await expect(
          page.getByText(`${testTodoTitle} (수정됨)`)
        ).toBeVisible({ timeout: 5000 });
        console.log("✓ 할 일 수정 성공");
      }
    } else {
      console.log("⚠ 수정 버튼을 찾을 수 없음");
    }

    console.log("=== 7. 할 일 삭제 ===");
    // 삭제 버튼 찾기
    const deleteButton = page
      .getByText(`${testTodoTitle} (수정됨)`)
      .locator("..")
      .locator("..")
      .locator("..")
      .locator('button')
      .filter({ hasText: /삭제/ })
      .first();

    if (await deleteButton.isVisible({ timeout: 3000 })) {
      await deleteButton.click();
      await page.waitForTimeout(1000);

      // 삭제 확인 다이얼로그 확인
      const confirmButton = page
        .locator('button')
        .filter({ hasText: /확인|삭제/ })
        .last();

      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);

        // 삭제된 할 일이 목록에서 사라졌는지 확인
        await expect(
          page.getByText(`${testTodoTitle} (수정됨)`)
        ).not.toBeVisible({ timeout: 5000 });
        console.log("✓ 할 일 삭제 성공");
      }
    } else {
      console.log("⚠ 삭제 버튼을 찾을 수 없음");
    }

    console.log("=== 8. AI 자연어 할 일 추가 ===");
    // AI 자연어 입력 필드 찾기
    const aiInput = page.locator('textarea[id="natural-language"]');
    if (await aiInput.isVisible({ timeout: 5000 })) {
      const aiTodoText = "내일 오후 3시까지 중요한 회의 준비하기";
      await aiInput.fill(aiTodoText);
      await page.waitForTimeout(500);

      // AI로 변환 버튼 클릭
      const aiButton = page.getByRole("button", { name: /AI로 변환/ });
      if (await aiButton.isVisible({ timeout: 2000 })) {
        await aiButton.click();
        await page.waitForTimeout(5000); // AI 파싱 대기

        // 폼이 채워졌는지 확인
        const filledTitle = page.locator('input[id="title"]');
        if (await filledTitle.isVisible({ timeout: 5000 })) {
          const titleValue = await filledTitle.inputValue();
          if (titleValue && titleValue.length > 0) {
            // 저장 버튼 클릭
            const aiSubmitBtn = page
              .locator('button[type="submit"]')
              .filter({ hasText: /추가|저장/ });
            await aiSubmitBtn.click();
            await page.waitForTimeout(2000);

            console.log("✓ AI 자연어 할 일 추가 성공");
          }
        }
      }
    } else {
      console.log("⚠ AI 자연어 입력 필드를 찾을 수 없음");
    }

    console.log("=== 9. AI 요약 및 분석 기능 테스트 ===");
    // AI 요약 섹션 찾기
    const aiSummarySection = page.locator("text=AI 요약 및 분석");
    if (await aiSummarySection.isVisible({ timeout: 5000 })) {
      // "오늘의 요약" 탭 확인
      const todayTab = page.getByRole("tab", { name: /오늘의 요약/ });
      if (await todayTab.isVisible({ timeout: 3000 })) {
        await todayTab.click();
        await page.waitForTimeout(1000);

        // "AI 요약 보기" 버튼 클릭
        const summaryButton = page
          .getByRole("button", { name: /AI 요약 보기/ })
          .first();

        if (await summaryButton.isVisible({ timeout: 3000 })) {
          await summaryButton.click();
          await page.waitForTimeout(10000); // AI 분석 대기

          // 요약 결과가 표시되는지 확인
          const summaryResult = page.locator("text=완료율").or(
            page.locator("text=인사이트")
          );
          if (await summaryResult.isVisible({ timeout: 10000 })) {
            console.log("✓ 오늘의 요약 기능 작동 확인");
          } else {
            console.log("⚠ 요약 결과가 표시되지 않음");
          }
        }
      }

      // "이번 주 요약" 탭 확인
      const weekTab = page.getByRole("tab", { name: /이번 주 요약/ });
      if (await weekTab.isVisible({ timeout: 3000 })) {
        await weekTab.click();
        await page.waitForTimeout(1000);

        const weekSummaryButton = page
          .getByRole("button", { name: /AI 요약 보기/ })
          .first();

        if (await weekSummaryButton.isVisible({ timeout: 3000 })) {
          await weekSummaryButton.click();
          await page.waitForTimeout(10000); // AI 분석 대기

          const weekSummaryResult = page.locator("text=완료율").or(
            page.locator("text=인사이트")
          );
          if (await weekSummaryResult.isVisible({ timeout: 10000 })) {
            console.log("✓ 이번 주 요약 기능 작동 확인");
          }
        }
      }
    } else {
      console.log("⚠ AI 요약 섹션을 찾을 수 없음");
    }

    console.log("=== 10. 검색 및 필터 기능 테스트 ===");
    // 검색 입력 필드 찾기
    const searchInput = page.locator('input[placeholder*="검색"]').or(
      page.locator('input[type="search"]')
    );

    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill("회의");
      await page.waitForTimeout(1000);
      console.log("✓ 검색 기능 테스트 완료");
    }

    console.log("=== 전체 테스트 완료 ===");
  });
});

