"use client";

import * as React from "react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { Edit2, Trash2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Todo } from "./types";

/**
 * 개별 할 일을 표시하는 카드 컴포넌트
 * @description 할 일의 제목, 설명, 우선순위, 마감일 등을 카드 형태로 표시하고 완료/수정/삭제 기능을 제공합니다.
 */
interface TodoCardProps {
  /** 표시할 할 일 데이터 */
  todo: Todo;
  /** 완료 상태 토글 핸들러 */
  onToggleComplete: (id: string) => void;
  /** 수정 핸들러 */
  onEdit: (todo: Todo) => void;
  /** 삭제 핸들러 */
  onDelete: (id: string) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

/**
 * 우선순위에 따른 색상 반환
 */
const getPriorityColor = (priority: Todo['priority']): string => {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-amber-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

/**
 * 우선순위 한글 표시
 */
const getPriorityLabel = (priority: Todo['priority']): string => {
  switch (priority) {
    case 'high':
      return '높음';
    case 'medium':
      return '중간';
    case 'low':
      return '낮음';
    default:
      return '미지정';
  }
};

/**
 * 마감일 뱃지 스타일 결정
 */
const getDueDateBadgeVariant = (dueDate: string | null): 'default' | 'destructive' | 'outline' => {
  if (!dueDate) return 'outline';
  
  const date = new Date(dueDate);
  if (isPast(date) && !isToday(date)) {
    return 'destructive'; // 지연된 경우 빨간색
  }
  if (isToday(date) || isTomorrow(date)) {
    return 'default'; // 오늘 또는 내일인 경우 기본 색상
  }
  return 'outline';
};

/**
 * 마감일 포맷팅
 */
const formatDueDate = (dueDate: string | null): string => {
  if (!dueDate) return '마감일 없음';
  
  const date = new Date(dueDate);
  if (isToday(date)) {
    return '오늘';
  }
  if (isTomorrow(date)) {
    return '내일';
  }
  if (isPast(date)) {
    return `지연: ${format(date, 'MM월 dd일', { locale: ko })}`;
  }
  return format(date, 'MM월 dd일', { locale: ko });
};

export const TodoCard = ({ 
  todo, 
  onToggleComplete, 
  onEdit, 
  onDelete,
  isLoading = false 
}: TodoCardProps) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleToggleComplete = () => {
    if (!isLoading) {
      onToggleComplete(todo.id);
    }
  };

  const handleEdit = () => {
    if (!isLoading) {
      onEdit(todo);
    }
  };

  const handleDelete = () => {
    if (!isLoading && window.confirm('정말 삭제하시겠습니까?')) {
      onDelete(todo.id);
    }
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        todo.completed && "opacity-60",
        isLoading && "pointer-events-none opacity-50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="flex flex-row items-start gap-3 pb-3">
        <div className="flex items-start gap-3 flex-1">
          <Checkbox
            checked={todo.completed}
            onCheckedChange={handleToggleComplete}
            disabled={isLoading}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-semibold text-base leading-tight",
                todo.completed && "line-through text-muted-foreground"
              )}
            >
              {todo.title}
            </h3>
            {todo.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {todo.description}
              </p>
            )}
          </div>
        </div>

        {/* 호버 시 수정/삭제 버튼 표시 */}
        {isHovered && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleEdit}
              disabled={isLoading}
              aria-label="수정"
            >
              <Edit2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              disabled={isLoading}
              aria-label="삭제"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* 우선순위 컬러 닷 */}
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "size-2 rounded-full",
                getPriorityColor(todo.priority)
              )}
              aria-label={`우선순위: ${getPriorityLabel(todo.priority)}`}
            />
            <span className="text-xs text-muted-foreground">
              {getPriorityLabel(todo.priority)}
            </span>
          </div>

          {/* 카테고리 뱃지 */}
          <Badge variant="outline" className="text-xs">
            {todo.category}
          </Badge>

          {/* 마감일 뱃지 */}
          {todo.due_date && (
            <Badge 
              variant={getDueDateBadgeVariant(todo.due_date)}
              className="text-xs flex items-center gap-1"
            >
              <Calendar className="size-3" />
              {formatDueDate(todo.due_date)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

