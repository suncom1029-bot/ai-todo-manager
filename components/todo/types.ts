/**
 * Todo 관련 타입 정의
 * @description 할 일 관리에 필요한 모든 타입을 정의합니다.
 */

/**
 * 할 일 우선순위 타입
 */
export type TodoPriority = 'high' | 'medium' | 'low';

/**
 * 할 일 카테고리 타입
 */
export type TodoCategory = '업무' | '개인' | '학습' | '기타';

/**
 * 할 일 데이터 타입
 * @description PRD의 todos 테이블 구조를 기반으로 정의
 */
export interface Todo {
  /** 할 일 고유 ID */
  id: string;
  /** 소유자 ID */
  user_id: string;
  /** 할 일 제목 (필수) */
  title: string;
  /** 상세 설명 (선택) */
  description: string | null;
  /** 우선순위 */
  priority: TodoPriority;
  /** 카테고리 */
  category: TodoCategory;
  /** 완료 여부 */
  completed: boolean;
  /** 마감일 (선택) */
  due_date: string | null;
  /** 생성일 */
  created_at: string;
  /** 수정일 (선택) */
  updated_at?: string | null;
}

/**
 * 할 일 생성/수정을 위한 폼 데이터 타입
 */
export interface TodoFormData {
  /** 할 일 제목 */
  title: string;
  /** 상세 설명 */
  description: string;
  /** 우선순위 */
  priority: TodoPriority;
  /** 카테고리 */
  category: TodoCategory;
  /** 마감일 */
  due_date: string;
}

