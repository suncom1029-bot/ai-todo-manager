# 제품 요구사항 정의서 (PRD): AI 할 일 관리 웹 서비스

## 1. 프로젝트 개요
**프로젝트명**: AI 할 일 관리 웹 서비스 (AI Todo Management Web Service)  
**목표**: 사용자가 자연어로 할 일을 입력하면 AI가 이를 분석하여 구조화된 데이터로 변환해 주고, 주기적인 요약을 제공하여 업무 효율성을 극대화하는 지능형 Todo 애플리케이션 개발.

## 2. 기술 스택
| 구분 | 기술 | 비고 |
| --- | --- | --- |
| **Frontend** | Next.js (App Router) | React 프레임워크 |
| **Styling** | Tailwind CSS, Shadcn/ui | 빠른 UI 구축 및 일관된 디자인 시스템 적용 |
| **Backend / DB** | Supabase | Auth, Database(PostgreSQL), Realtime |
| **AI** | Google Gemini API (via AI SDK) | 자연어 처리, 할 일 생성 및 요약 |
| **State Mgmt** | React Query / Zustand | 서버 상태 및 클라이언트 상태 관리 |

## 3. 데이터베이스 구조 (Supabase)

### 3.1 `users` 테이블
Supabase Auth와 연동하여 사용자 정보를 관리합니다.
| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| `id` | UUID | Primary Key (auth.users 참조) |
| `email` | Text | 사용자 이메일 |
| `created_at` | Timestamp | 가입일 |

### 3.2 `todos` 테이블
개별 사용자의 할 일을 저장합니다.
| 필드명 | 타입 | 제약조건 | 설명 |
| --- | --- | --- | --- |
| `id` | UUID | PK, default: uuid_generate_v4() | 할 일 고유 ID |
| `user_id` | UUID | FK (users.id) | 소유자 ID |
| `title` | Text | Not Null | 할 일 제목 |
| `description` | Text | Nullable | 상세 설명 |
| `priority` | Text | Check ('high', 'medium', 'low') | 우선순위 |
| `category` | Text | Default: '기타' | 업무, 개인, 학습 등 |
| `completed` | Boolean | Default: false | 완료 여부 |
| `due_date` | Timestamp | Nullable | 마감일 |
| `created_at` | Timestamp | Default: now() | 생성일 |

### 3.3 데이터베이스 보안 (RLS 정책)
Supabase Row Level Security(RLS)를 적용하여 데이터 접근을 엄격히 제어합니다.
*   **Policy**: `todos` 테이블의 모든 작업(SELECT, INSERT, UPDATE, DELETE)은 `auth.uid() = user_id` 조건 하에 허용.
*   **목적**: 인증된 사용자 본인의 데이터에만 접근 가능하도록 강제.

## 4. 상세 기능 명세

### 4.1 인증 (Supabase Auth)
*   **회원가입**: 이메일/비밀번호 기반 가입.
*   **로그인/로그아웃**: 세션 관리 및 보안 토큰 처리.
*   **미들웨어**: 비로그인 사용자의 메인 페이지 접근 차단 (로그인 페이지로 리다이렉트).

### 4.2 할 일 관리 (CRUD)
*   **Create**: 제목, 설명, 마감일, 우선순위, 카테고리를 입력받아 생성.
*   **Read**: 로그인한 사용자의 할 일 목록 조회.
*   **Update**: 할 일 내용 수정 및 완료 상태(`completed`) 토글.
*   **Delete**: 할 일 삭제 (Soft delete 혹은 Hard delete 정책 결정, MVP는 Hard delete).

### 4.3 검색, 필터 및 정렬
*   **검색**: 클라이언트 사이드 혹은 DB 쿼리를 통해 제목 및 설명 필드 검색.
*   **필터링**:
    *   우선순위: 높음 / 중간 / 낮음
    *   카테고리: 사용자 정의 혹은 고정값 (업무 / 개인 / 학습)
    *   진행상태: 진행 중(completed=false/due_date>now), 완료(completed=true), 지연(completed=false/due_date<now)
*   **정렬**: 우선순위(높음순), 마감일(임박순), 생성일(최신순).

### 4.4 AI 할 일 생성 (Natural Language to Structured Data)
*   **입력**: 사용자가 텍스트 입력창에 자연어로 할 일 입력.
    *   예: "내일 오전 10시에 팀 회의 준비"
*   **처리**: Google Gemini API에 프롬프트 전송 → JSON 응답 파싱.
*   **프롬프트 예시**:
    ```text
    입력된 문장을 분석하여 다음 JSON 형식으로 반환하시오.
    - due_date는 현재 시간(context 제공 필요)을 기준으로 상대적 시간을 절대 시간(ISO 8601)으로 변환.
    - priority는 문맥상 긴급도에 따라 high, medium, low 중 하나 선택.
    ```
*   **변환 데이터 매핑**:
    *   `title`: "팀 회의 준비"
    *   `description`: "내일 오전 10시에 있을 팀 회의를 위해 자료 작성하기" (AI가 보강하거나 원문 유지)
    *   `priority`: "high"
    *   `category`: "업무" (문맥 분석 후 자동 태깅)
    *   `due_date`: "2024-XX-XXT10:00:00Z"

### 4.5 AI 요약 및 분석
*   **트리거**: 메인 화면의 'AI 요약' 버튼 클릭.
*   **일일 요약**: 오늘 `due_date`인 항목, 완료된 항목, 미완료 항목 요약 텍스트 생성.
*   **주간 요약**: 금주 완료율(%) 계산 및 주요 성과/지연 사유 AI 분석 코멘트.

### 4.6 에러 처리 및 예외 시나리오
*   **AI 서비스 장애/실패**:
    *   Gemini API 타임아웃(10초) 또는 파싱 불가능한 응답 수신 시.
    *   **대응**: 사용자에게 "AI 분석에 실패했습니다. 수동으로 입력해주세요." 토스트 메시지 출력 후, 입력된 텍스트를 유지한 채 상세 입력 폼(Modal/Sheet) 자동 오픈.
*   **필수 값 누락**:
    *   할 일 제목 등 필수 항목 누락 시, 저장 버튼 비활성화 및 해당 필드에 에러 메시지 표시.

## 5. UI/UX 화면 구성

### 5.1 로그인/회원가입 페이지 (`/auth`)
*   중앙 정렬된 카드 형태의 폼.
*   이메일, 비밀번호 입력 필드 및 '로그인', '회원가입' 버튼.
*   간단한 서비스 로고 및 소개 문구.

### 5.2 메인 대시보드 (`/`)
*   **상단 헤더**: 로고, 사용자 프로필(로그아웃), 테마 토글.
*   **AI 입력 바**: 상단에 눈에 띄게 배치. "무엇을 해야 하나요?" Placeholder. 입력 후 엔터 시 AI 분석 로딩 인디케이터 표시.
*   **컨트롤 패널**: 검색창, 필터 드롭다운(우선순위, 카테고리), 정렬 버튼.
*   **할 일 목록 영역**:
    *   카드 혹은 리스트 아이템 형태.
    *   각 아이템: 체크박스(완료), 제목, 마감일 뱃지(임박 시 빨간색), 우선순위 컬러 닷.
    *   호버 시 수정/삭제 아이콘 노출.
*   **사이드바/모달 (AI 요약)**: 버튼 클릭 시 우측에서 슬라이드 오버되거나 모달로 뜨는 AI 분석 리포트 창.

### 5.3 반응형 및 UX 피드백 (공통)
*   **반응형 대응**: 모바일 환경에서는 사이드바 대신 하단 탭 바 또는 햄버거 메뉴 사용. AI 요약은 Bottom Sheet로 제공.
*   **UX 피드백**:
    *   **로딩**: AI 요청 시 입력창 우측에 스피너 표시 및 입력창 비활성화.
    *   **성공/실패**: 작업 완료 시 하단 중앙에 Toast 메시지 (Sonner 라이브러리 권장) 노출.

### 5.4 통계/분석 페이지 (추후 확장) (`/stats`)
*   차트 라이브러리(Recharts 등) 활용.
*   주간 활동량 그래프, 카테고리별 파이 차트 제공.

## 6. 개발 로드맵 (마일스톤)
1.  **Phase 1 (환경 설정 및 Auth)**: Next.js 세팅, Supabase 연동, 로그인 구현.
2.  **Phase 2 (Core Feature)**: `todos` 테이블 생성, 기본 CRUD UI 및 로직 구현.
3.  **Phase 3 (AI Integration)**: Gemini API 연동, 자연어 → JSON 변환 로직, AI 요약 기능 구현.
4.  **Phase 4 (Refinement)**: 검색/필터/정렬 고도화, Shadcn/ui 디자인 폴리싱, 반응형 대응.

## 7. AI 프롬프트 전략 (System Instructions)
*   **공통**: "결과는 반드시 Markdown 코드 블럭 없이 순수한 JSON 텍스트만 반환해."
*   **생성 시**: "너는 개인 비서야. 사용자의 입력을 분석해서 JSON으로 내놓아. 오늘 날짜는 {YYYY-MM-DD}야. JSON 키는 PRD 명세를 따라야 해."
*   **요약 시**: "다음은 사용자의 할 일 목록이야. {TODO_LIST_JSON}. 이를 바탕으로 오늘 할 일과 이번 주 성과를 격려하는 어조로 요약해 줘."

## 8. 환경 변수 및 설정 (.env.local)
*   `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon API Key
*   `GOOGLE_GEMINI_API_KEY`: Google AI Studio API Key
