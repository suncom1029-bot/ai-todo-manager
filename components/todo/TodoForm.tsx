"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Sparkles, Loader2 } from "lucide-react";
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
  const [naturalLanguageInput, setNaturalLanguageInput] = React.useState("");
  const [isParsingAI, setIsParsingAI] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

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

  /**
   * AI 자연어 파싱 핸들러
   * @description 자연어 입력을 AI로 파싱하여 폼에 자동으로 채웁니다.
   */
  const handleAIParse = async () => {
    if (!naturalLanguageInput.trim()) {
      setAiError("자연어 입력을 입력해주세요.");
      return;
    }

    setIsParsingAI(true);
    setAiError(null);

    try {
      const response = await fetch("/api/ai/parse-todo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          naturalLanguageInput: naturalLanguageInput.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "알 수 없는 오류" }));
        throw new Error(errorData.error || "AI 파싱에 실패했습니다.");
      }

      const parsedData = await response.json();

      // 파싱된 데이터를 폼에 채우기
      setValue("title", parsedData.title, { shouldValidate: true });
      setValue("description", parsedData.description || "", { shouldValidate: true });
      setValue("priority", parsedData.priority, { shouldValidate: true });
      setValue("category", parsedData.category, { shouldValidate: true });

      // 날짜와 시간 처리
      if (parsedData.due_date) {
        const dateObj = parseISO(parsedData.due_date);
        setSelectedDate(dateObj);
        setValue("due_date", parsedData.due_date, { shouldValidate: true });
      } else {
        setSelectedDate(undefined);
        setValue("due_date", "", { shouldValidate: true });
      }

      // 자연어 입력 필드 초기화
      setNaturalLanguageInput("");
    } catch (error) {
      console.error("AI 파싱 오류:", error);
      setAiError(
        error instanceof Error
          ? error.message
          : "AI 파싱 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    } finally {
      setIsParsingAI(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* AI 자연어 입력 영역 */}
      <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-4 text-primary" />
          <Label htmlFor="natural-language" className="text-sm font-medium">
            AI로 할 일 생성
          </Label>
        </div>
        <div className="space-y-2">
          <Textarea
            id="natural-language"
            placeholder="예: 내일 오후 3시까지 중요한 팀 회의 준비하기"
            value={naturalLanguageInput}
            onChange={(e) => {
              setNaturalLanguageInput(e.target.value);
              setAiError(null);
            }}
            disabled={isLoading || isParsingAI}
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAIParse}
              disabled={isLoading || isParsingAI || !naturalLanguageInput.trim()}
              className="flex items-center gap-2"
            >
              {isParsingAI ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  AI 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  AI로 변환
                </>
              )}
            </Button>
            {aiError && (
              <p className="text-xs text-destructive" role="alert">
                {aiError}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            자연어로 할 일을 입력하면 AI가 제목, 날짜, 우선순위, 카테고리를 자동으로 추출합니다.
          </p>
        </div>
      </div>

      {/* 구분선 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">또는 직접 입력</span>
        </div>
      </div>

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

