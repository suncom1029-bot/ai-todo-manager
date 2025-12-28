-- ============================================
-- AI 할 일 관리 서비스 - Supabase 데이터베이스 스키마
-- ============================================
-- 이 스크립트는 Supabase SQL Editor에서 직접 실행 가능합니다.
-- PRD 문서의 데이터베이스 구조를 기반으로 작성되었습니다.

-- ============================================
-- 1. Extensions 활성화
-- ============================================
-- UUID 생성 함수를 사용하기 위해 필요
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. users 테이블 생성
-- ============================================
-- auth.users와 1:1로 연결되는 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- users 테이블에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- users 테이블에 코멘트 추가
COMMENT ON TABLE public.users IS '사용자 프로필 테이블 (auth.users와 1:1 연결)';
COMMENT ON COLUMN public.users.id IS '사용자 고유 ID (auth.users.id 참조)';
COMMENT ON COLUMN public.users.email IS '사용자 이메일';
COMMENT ON COLUMN public.users.created_at IS '가입일';

-- ============================================
-- 3. todos 테이블 생성
-- ============================================
-- 개별 사용자의 할 일을 저장하는 테이블
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  category TEXT NOT NULL DEFAULT '기타',
  completed BOOLEAN NOT NULL DEFAULT false,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- todos 테이블에 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON public.todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON public.todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_category ON public.todos(category);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON public.todos(priority);

-- todos 테이블에 코멘트 추가
COMMENT ON TABLE public.todos IS '할 일 관리 테이블';
COMMENT ON COLUMN public.todos.id IS '할 일 고유 ID';
COMMENT ON COLUMN public.todos.user_id IS '소유자 ID (users.id 참조)';
COMMENT ON COLUMN public.todos.title IS '할 일 제목';
COMMENT ON COLUMN public.todos.description IS '상세 설명';
COMMENT ON COLUMN public.todos.priority IS '우선순위 (high, medium, low)';
COMMENT ON COLUMN public.todos.category IS '카테고리 (업무, 개인, 학습, 기타)';
COMMENT ON COLUMN public.todos.completed IS '완료 여부';
COMMENT ON COLUMN public.todos.due_date IS '마감일';
COMMENT ON COLUMN public.todos.created_at IS '생성일';
COMMENT ON COLUMN public.todos.updated_at IS '수정일';

-- ============================================
-- 4. updated_at 자동 업데이트 함수 및 트리거
-- ============================================
-- todos 테이블의 updated_at 컬럼을 자동으로 업데이트하는 함수
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- todos 테이블에 updated_at 트리거 추가
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. Row Level Security (RLS) 활성화
-- ============================================

-- users 테이블 RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- todos 테이블 RLS 활성화
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS 정책 생성 - users 테이블
-- ============================================

-- users 테이블 SELECT 정책: 본인의 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- users 테이블 INSERT 정책: 본인의 프로필만 생성 가능
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- users 테이블 UPDATE 정책: 본인의 프로필만 수정 가능
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- users 테이블 DELETE 정책: 본인의 프로필만 삭제 가능
CREATE POLICY "Users can delete own profile"
  ON public.users
  FOR DELETE
  USING (auth.uid() = id);

-- ============================================
-- 7. RLS 정책 생성 - todos 테이블
-- ============================================

-- todos 테이블 SELECT 정책: 본인의 할 일만 조회 가능
CREATE POLICY "Users can view own todos"
  ON public.todos
  FOR SELECT
  USING (auth.uid() = user_id);

-- todos 테이블 INSERT 정책: 본인의 할 일만 생성 가능
CREATE POLICY "Users can insert own todos"
  ON public.todos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- todos 테이블 UPDATE 정책: 본인의 할 일만 수정 가능
CREATE POLICY "Users can update own todos"
  ON public.todos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- todos 테이블 DELETE 정책: 본인의 할 일만 삭제 가능
CREATE POLICY "Users can delete own todos"
  ON public.todos
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 8. 사용자 프로필 자동 생성 함수 (선택사항)
-- ============================================
-- auth.users에 새 사용자가 생성될 때 자동으로 public.users에 프로필을 생성하는 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 트리거 추가
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ 데이터베이스 스키마 생성이 완료되었습니다!';
  RAISE NOTICE '✅ users 테이블 생성 완료';
  RAISE NOTICE '✅ todos 테이블 생성 완료';
  RAISE NOTICE '✅ RLS 정책 설정 완료';
  RAISE NOTICE '✅ 인덱스 생성 완료';
  RAISE NOTICE '✅ 트리거 설정 완료';
END $$;

