"use client";

import * as React from "react";
import { TodoCard } from "./TodoCard";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import type { Todo } from "./types";

/**
 * 할 일 목록을 표시하는 컴포넌트
 * @description 사용자의 할 일 목록을 카드 형태로 표시하고, 완료/수정/삭제 기능을 제공합니다.
 */
interface TodoListProps {
  /** 표시할 할 일 목록 */
  todos: Todo[];
  /** 완료 상태 토글 핸들러 */
  onToggleComplete: (id: string) => void;
  /** 수정 핸들러 */
  onEdit: (todo: Todo) => void;
  /** 삭제 핸들러 */
  onDelete: (id: string) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 빈 상태 메시지 */
  emptyMessage?: string;
}

/**
 * 할 일 목록 컴포넌트
 */
export const TodoList = ({
  todos,
  onToggleComplete,
  onEdit,
  onDelete,
  isLoading = false,
  emptyMessage = "할 일이 없습니다. 새로운 할 일을 추가해보세요!"
}: TodoListProps) => {
  // 빈 상태 처리
  if (!isLoading && todos.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyTitle>할 일이 없습니다</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {todos.map((todo) => (
        <TodoCard
          key={todo.id}
          todo={todo}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};

