"use client";

import * as React from "react";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { TodoPriority, TodoCategory } from "@/components/todo/types";

/**
 * 필터 상태 타입
 */
export interface FilterState {
  /** 검색어 */
  search: string;
  /** 완료 상태 필터 */
  status: "all" | "completed" | "pending";
  /** 우선순위 필터 */
  priority: "all" | TodoPriority;
  /** 카테고리 필터 */
  category: "all" | TodoCategory;
  /** 정렬 기준 */
  sortBy: "priority" | "dueDate" | "createdAt" | "title";
  /** 정렬 방향 */
  sortOrder: "asc" | "desc";
}

/**
 * 툴바 컴포넌트
 * @description 검색, 필터, 정렬 기능을 제공하는 툴바입니다.
 */
interface ToolbarProps {
  /** 현재 필터 상태 */
  filters: FilterState;
  /** 필터 변경 핸들러 */
  onFilterChange: (filters: FilterState) => void;
}

export const Toolbar = ({ filters, onFilterChange }: ToolbarProps) => {
  /**
   * 검색어 변경 핸들러
   */
  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, search: value });
  };

  /**
   * 완료 상태 필터 변경 핸들러
   */
  const handleStatusChange = (value: string) => {
    onFilterChange({
      ...filters,
      status: value as FilterState["status"],
    });
  };

  /**
   * 우선순위 필터 변경 핸들러
   */
  const handlePriorityChange = (value: string) => {
    onFilterChange({
      ...filters,
      priority: value as FilterState["priority"],
    });
  };

  /**
   * 카테고리 필터 변경 핸들러
   */
  const handleCategoryChange = (value: string) => {
    onFilterChange({
      ...filters,
      category: value as FilterState["category"],
    });
  };

  /**
   * 정렬 기준 변경 핸들러
   */
  const handleSortChange = (value: string) => {
    onFilterChange({
      ...filters,
      sortBy: value as FilterState["sortBy"],
    });
  };

  /**
   * 정렬 방향 토글 핸들러
   */
  const handleSortOrderToggle = () => {
    onFilterChange({
      ...filters,
      sortOrder: filters.sortOrder === "asc" ? "desc" : "asc",
    });
  };

  return (
    <div className="space-y-4">
      {/* 검색창 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="할 일 검색..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 필터 및 정렬 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 완료 상태 필터 */}
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-2 size-4" />
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="pending">진행 중</SelectItem>
            <SelectItem value="completed">완료</SelectItem>
          </SelectContent>
        </Select>

        {/* 우선순위 필터 */}
        <Select value={filters.priority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="우선순위" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="high">높음</SelectItem>
            <SelectItem value="medium">중간</SelectItem>
            <SelectItem value="low">낮음</SelectItem>
          </SelectContent>
        </Select>

        {/* 카테고리 필터 */}
        <Select value={filters.category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="업무">업무</SelectItem>
            <SelectItem value="개인">개인</SelectItem>
            <SelectItem value="학습">학습</SelectItem>
            <SelectItem value="기타">기타</SelectItem>
          </SelectContent>
        </Select>

        {/* 정렬 기준 */}
        <Select value={filters.sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[140px]">
            <ArrowUpDown className="mr-2 size-4" />
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">우선순위</SelectItem>
            <SelectItem value="dueDate">마감일</SelectItem>
            <SelectItem value="createdAt">생성일</SelectItem>
            <SelectItem value="title">제목</SelectItem>
          </SelectContent>
        </Select>

        {/* 정렬 방향 토글 버튼 */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleSortOrderToggle}
          title={filters.sortOrder === "asc" ? "오름차순" : "내림차순"}
        >
          <ArrowUpDown
            className={`size-4 transition-transform ${
              filters.sortOrder === "desc" ? "rotate-180" : ""
            }`}
          />
        </Button>
      </div>
    </div>
  );
};

