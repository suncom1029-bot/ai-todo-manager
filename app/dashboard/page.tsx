"use client";

import * as React from "react";
import { Header } from "@/components/layout/Header";
import { Toolbar, type FilterState } from "@/components/layout/Toolbar";
import { TodoForm, TodoList, type Todo, type TodoFormData } from "@/components/todo";
import { Separator } from "@/components/ui/separator";

/**
 * Mock 데이터 생성 함수
 */
const generateMockTodos = (): Todo[] => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return [
    {
      id: "1",
      user_id: "user-1",
      title: "프로젝트 기획서 작성",
      description: "다음 분기 프로젝트 기획서 초안 작성하기",
      priority: "high",
      category: "업무",
      completed: false,
      due_date: tomorrow.toISOString(),
      created_at: now.toISOString(),
    },
    {
      id: "2",
      user_id: "user-1",
      title: "운동하기",
      description: "헬스장에서 1시간 운동",
      priority: "medium",
      category: "개인",
      completed: false,
      due_date: now.toISOString(),
      created_at: now.toISOString(),
    },
    {
      id: "3",
      user_id: "user-1",
      title: "React 학습",
      description: "Next.js 15 App Router 학습하기",
      priority: "high",
      category: "학습",
      completed: true,
      due_date: nextWeek.toISOString(),
      created_at: now.toISOString(),
    },
    {
      id: "4",
      user_id: "user-1",
      title: "장보기",
      description: "주말 장보기 목록 작성 및 구매",
      priority: "low",
      category: "개인",
      completed: false,
      due_date: null,
      created_at: now.toISOString(),
    },
  ];
};

/**
 * 메인 대시보드 페이지
 * @description 할 일 관리 메인 화면으로, 할 일 목록 표시, 추가, 수정, 삭제, 검색, 필터, 정렬 기능을 제공합니다.
 */
export default function DashboardPage() {
  const [todos, setTodos] = React.useState<Todo[]>(generateMockTodos());
  const [editingTodo, setEditingTodo] = React.useState<Todo | null>(null);
  const [filters, setFilters] = React.useState<FilterState>({
    search: "",
    status: "all",
    priority: "all",
    category: "all",
    sortBy: "priority",
    sortOrder: "desc",
  });

  /**
   * 필터링 및 정렬된 할 일 목록 반환
   */
  const getFilteredAndSortedTodos = (): Todo[] => {
    let filtered = [...todos];

    // 검색 필터
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (todo) =>
          todo.title.toLowerCase().includes(searchLower) ||
          (todo.description?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    // 완료 상태 필터
    if (filters.status === "completed") {
      filtered = filtered.filter((todo) => todo.completed);
    } else if (filters.status === "pending") {
      filtered = filtered.filter((todo) => !todo.completed);
    }

    // 우선순위 필터
    if (filters.priority !== "all") {
      filtered = filtered.filter((todo) => todo.priority === filters.priority);
    }

    // 카테고리 필터
    if (filters.category !== "all") {
      filtered = filtered.filter((todo) => todo.category === filters.category);
    }

    // 정렬
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case "dueDate":
          const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case "createdAt":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return filters.sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  /**
   * 할 일 추가 핸들러
   */
  const handleAddTodo = async (data: TodoFormData) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      user_id: "user-1",
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      category: data.category,
      completed: false,
      due_date: data.due_date || null,
      created_at: new Date().toISOString(),
    };

    setTodos([...todos, newTodo]);
    setEditingTodo(null);
  };

  /**
   * 할 일 수정 핸들러
   */
  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
  };

  /**
   * 할 일 업데이트 핸들러
   */
  const handleUpdateTodo = async (data: TodoFormData) => {
    if (!editingTodo) return;

    setTodos(
      todos.map((todo) =>
        todo.id === editingTodo.id
          ? {
              ...todo,
              title: data.title,
              description: data.description || null,
              priority: data.priority,
              category: data.category,
              due_date: data.due_date || null,
              updated_at: new Date().toISOString(),
            }
          : todo
      )
    );
    setEditingTodo(null);
  };

  /**
   * 할 일 삭제 핸들러
   */
  const handleDeleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  /**
   * 할 일 완료 상태 토글 핸들러
   */
  const handleToggleComplete = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id
          ? { ...todo, completed: !todo.completed, updated_at: new Date().toISOString() }
          : todo
      )
    );
  };

  /**
   * 로그아웃 핸들러
   */
  const handleLogout = () => {
    // TODO: Supabase Auth 로그아웃
    console.log("로그아웃");
    window.location.href = "/";
  };

  const filteredTodos = getFilteredAndSortedTodos();

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <Header userEmail="user@example.com" onLogout={handleLogout} />

      {/* 메인 컨텐츠 */}
      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {/* 툴바 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">할 일 관리</h2>
          <Toolbar filters={filters} onFilterChange={setFilters} />
        </div>

        <Separator />

        {/* 본문 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 할 일 추가/수정 폼 (좌측 또는 상단) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <TodoForm
                initialData={editingTodo}
                onSubmit={editingTodo ? handleUpdateTodo : handleAddTodo}
                onCancel={() => setEditingTodo(null)}
                submitButtonText={editingTodo ? "수정" : "추가"}
              />
            </div>
          </div>

          {/* 할 일 목록 (우측 또는 하단) */}
          <div className="lg:col-span-2">
            <TodoList
              todos={filteredTodos}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditTodo}
              onDelete={handleDeleteTodo}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

