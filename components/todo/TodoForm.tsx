"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Todo, TodoFormData, TodoPriority, TodoCategory } from "./types";

/**
 * 할 일 폼 검증 스키마
 */
const todoFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").max(100, "제목은 100자 이하로 입력해주세요"),
  description: z.string().max(500, "설명은 500자 이하로 입력해주세요").optional(),
  priority: z.enum(['high', 'medium', 'low']),
  category: z.enum(['업무', '개인', '학습', '기타']),
  due_date: z.string().optional(),
});

type TodoFormSchema = z.infer<typeof todoFormSchema>;

/**
 * 할 일 추가/편집 폼 컴포넌트
 * @description 할 일을 생성하거나 수정하기 위한 폼을 제공합니다.
 */
interface TodoFormProps {
  /** 편집 모드일 경우 기존 할 일 데이터 */
  initialData?: Todo | null;
  /** 폼 제출 핸들러 */
  onSubmit: (data: TodoFormData) => void | Promise<void>;
  /** 취소 핸들러 */
  onCancel?: () => void;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 제출 버튼 텍스트 */
  submitButtonText?: string;
}

/**
 * 할 일 폼 컴포넌트
 */
export const TodoForm = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitButtonText = "저장",
}: TodoFormProps) => {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    initialData?.due_date ? new Date(initialData.due_date) : undefined
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TodoFormSchema>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      priority: initialData?.priority ?? 'medium',
      category: initialData?.category ?? '기타',
      due_date: initialData?.due_date ?? '',
    },
  });

  const priority = watch('priority');
  const category = watch('category');

  /**
   * 폼 제출 처리
   */
  const handleFormSubmit = async (data: TodoFormSchema) => {
    const formData: TodoFormData = {
      title: data.title,
      description: data.description ?? '',
      priority: data.priority as TodoPriority,
      category: data.category as TodoCategory,
      due_date: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : '',
    };
    
    await onSubmit(formData);
  };

  /**
   * 날짜 선택 핸들러
   */
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setValue('due_date', format(date, "yyyy-MM-dd'T'HH:mm"), {
        shouldValidate: true,
      });
    } else {
      setValue('due_date', '', { shouldValidate: true });
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* 제목 입력 */}
      <div className="space-y-2">
        <Label htmlFor="title">
          제목 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="할 일 제목을 입력하세요"
          disabled={isLoading}
          aria-invalid={errors.title ? 'true' : 'false'}
        />
        {errors.title && (
          <p className="text-sm text-destructive" role="alert">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* 설명 입력 */}
      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="상세 설명을 입력하세요 (선택사항)"
          rows={4}
          disabled={isLoading}
          aria-invalid={errors.description ? 'true' : 'false'}
        />
        {errors.description && (
          <p className="text-sm text-destructive" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* 우선순위 선택 */}
      <div className="space-y-2">
        <Label htmlFor="priority">우선순위</Label>
        <Select
          value={priority}
          onValueChange={(value) => setValue('priority', value as TodoPriority)}
          disabled={isLoading}
        >
          <SelectTrigger id="priority">
            <SelectValue placeholder="우선순위를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">높음</SelectItem>
            <SelectItem value="medium">중간</SelectItem>
            <SelectItem value="low">낮음</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 카테고리 선택 */}
      <div className="space-y-2">
        <Label htmlFor="category">카테고리</Label>
        <Select
          value={category}
          onValueChange={(value) => setValue('category', value as TodoCategory)}
          disabled={isLoading}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="카테고리를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="업무">업무</SelectItem>
            <SelectItem value="개인">개인</SelectItem>
            <SelectItem value="학습">학습</SelectItem>
            <SelectItem value="기타">기타</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 마감일 선택 */}
      <div className="space-y-2">
        <Label htmlFor="due_date">마감일</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="due_date"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
              disabled={isLoading}
              type="button"
            >
              <CalendarIcon className="mr-2 size-4" />
              {selectedDate ? (
                format(selectedDate, "yyyy년 MM월 dd일")
              ) : (
                <span>마감일을 선택하세요 (선택사항)</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {selectedDate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDate(undefined);
              setValue('due_date', '');
            }}
            disabled={isLoading}
            className="text-xs"
          >
            마감일 제거
          </Button>
        )}
      </div>

      {/* 버튼 영역 */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            취소
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '저장 중...' : submitButtonText}
        </Button>
      </div>
    </form>
  );
};

