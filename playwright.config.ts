import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 설정 파일
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* 테스트 실행 시 최대 시간 (30초) */
  timeout: 30 * 1000,
  expect: {
    /* expect assertions의 타임아웃 (5초) */
    timeout: 5000
  },
  /* 테스트를 병렬로 실행 */
  fullyParallel: true,
  /* CI에서 실패 시 재시도 비활성화 */
  forbidOnly: !!process.env.CI,
  /* CI에서 실패 시 재시도 */
  retries: process.env.CI ? 2 : 0,
  /* 병렬 실행 워커 수 */
  workers: process.env.CI ? 1 : undefined,
  /* 리포트 설정 */
  reporter: 'html',
  /* 공유 설정 */
  use: {
    /* 기본 타임아웃 (액션당) */
    actionTimeout: 0,
    /* 실패 시 스크린샷 */
    screenshot: 'only-on-failure',
    /* 실패 시 비디오 */
    video: 'retain-on-failure',
    /* 트레이스 */
    trace: 'on-first-retry',
  },

  /* 프로젝트 설정 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* 개발 서버 설정 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

