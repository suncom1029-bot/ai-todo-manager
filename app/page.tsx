"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Toolbar, type FilterState } from "@/components/layout/Toolbar";
import { TodoForm, TodoList, type Todo, type TodoFormData } from "@/components/todo";
import { AISummarySection } from "@/components/ai/AISummarySection";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

/**
 * 메인 대시보드 페이지
 * @description 할 일 관리 메인 화면으로, 할 일 목록 표시, 추가, 수정, 삭제, 검색, 필터, 정렬 기능을 제공합니다.
 */
export default function Home() {
  const router = useRouter();
  const { user, isLoading: isLoadingUser, signOut } = useAuth();
  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [editingTodo, setEditingTodo] = React.useState<Todo | null>(null);
  const [isLoadingTodos, setIsLoadingTodos] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [deleteTodoId, setDeleteTodoId] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<FilterState>({
    search: "",
    status: "all",
    priority: "all",
    category: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  /**
   * 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
   */
  React.useEffect(() => {
    if (!isLoadingUser && !user) {
      router.push("/login");
    }
  }, [user, isLoadingUser, router]);

  /**
   * 할 일 목록 조회
   * @description 로그인한 사용자의 할 일 목록을 Supabase에서 가져옵니다.
   */
  const fetchTodos = React.useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingTodos(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      // 로그인한 사용자의 할 일만 조회 (user_id 기준 필터링)
      // 최근 생성 순으로 정렬 (created_at 내림차순)
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("할 일 조회 오류:", error);
        
        // 인증 오류인 경우
        if (error.code === "PGRST301" || error.message.includes("JWT")) {
          setErrorMessage("인증이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            signOut();
          }, 2000);
          return;
        }

        setErrorMessage("할 일 목록을 불러오는 중 오류가 발생했습니다.");
        return;
      }

      setTodos(data || []);
    } catch (error) {
      console.error("할 일 조회 예외:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "할 일 목록을 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoadingTodos(false);
    }
  }, [user?.id, signOut]);

  /**
   * 사용자 로그인 시 할 일 목록 조회
   */
  React.useEffect(() => {
    if (user?.id) {
      fetchTodos();
    }
  }, [user?.id, fetchTodos]);

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
        case "title":
          comparison = a.title.localeCompare(b.title, "ko");
          break;
      }

      return filters.sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  /**
   * 할 일 추가 핸들러
   * @description 사용자 입력을 받아 현재 로그인한 사용자의 할 일을 Supabase에 저장합니다.
   */
  const handleAddTodo = async (data: TodoFormData) => {
    if (!user?.id) {
      setErrorMessage("로그인이 필요합니다.");
      return;
    }

    setIsLoadingTodos(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      // Supabase에 할 일 생성
      const { data: newTodo, error } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          category: data.category,
          completed: false,
          due_date: data.due_date || null,
        } as any)
        .select()
        .single();

      if (error) {
        console.error("할 일 생성 오류:", error);
        
        // 인증 오류인 경우
        if (error.code === "PGRST301" || error.message.includes("JWT")) {
          setErrorMessage("인증이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            signOut();
          }, 2000);
          return;
        }

        setErrorMessage("할 일을 추가하는 중 오류가 발생했습니다.");
        return;
      }

      // 생성된 항목을 즉시 목록에 반영
      if (newTodo) {
        setTodos([newTodo, ...todos]);
        setEditingTodo(null);
      }

      // 목록 다시 조회하여 최신 상태 반영
      await fetchTodos();
    } catch (error) {
      console.error("할 일 생성 예외:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "할 일을 추가하는 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoadingTodos(false);
    }
  };

  /**
   * 할 일 수정 핸들러
   */
  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
  };

  /**
   * 할 일 업데이트 핸들러
   * @description 본인 소유의 할 일만 수정합니다.
   */
  const handleUpdateTodo = async (data: TodoFormData) => {
    if (!editingTodo || !user?.id) {
      setErrorMessage("로그인이 필요합니다.");
      return;
    }

    // 본인 소유인지 확인
    if (editingTodo.user_id !== user.id) {
      setErrorMessage("본인의 할 일만 수정할 수 있습니다.");
      return;
    }

    setIsLoadingTodos(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      // Supabase에서 할 일 수정
      const { data: updatedTodo, error } = await supabase
        .from("todos")
        .update({
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          category: data.category,
          due_date: data.due_date || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", editingTodo.id)
        .eq("user_id", user.id) // 본인 소유인지 다시 확인
        .select()
        .single();

      if (error) {
        console.error("할 일 수정 오류:", error);
        
        // 인증 오류인 경우
        if (error.code === "PGRST301" || error.message.includes("JWT")) {
          setErrorMessage("인증이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            signOut();
          }, 2000);
          return;
        }

        setErrorMessage("할 일을 수정하는 중 오류가 발생했습니다.");
        return;
      }

      // 수정된 항목을 목록에 반영
      if (updatedTodo) {
        setTodos(todos.map((todo) => (todo.id === editingTodo.id ? updatedTodo : todo)));
        setEditingTodo(null);
      }

      // 목록 다시 조회하여 최신 상태 반영
      await fetchTodos();
    } catch (error) {
      console.error("할 일 수정 예외:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "할 일을 수정하는 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoadingTodos(false);
    }
  };

  /**
   * 할 일 삭제 확인 다이얼로그 열기
   */
  const handleDeleteClick = (id: string) => {
    setDeleteTodoId(id);
  };

  /**
   * 할 일 삭제 핸들러
   * @description 본인 소유의 할 일만 삭제합니다.
   */
  const handleDeleteTodo = async () => {
    if (!deleteTodoId || !user?.id) {
      setErrorMessage("로그인이 필요합니다.");
      setDeleteTodoId(null);
      return;
    }

    const todoToDelete = todos.find((todo) => todo.id === deleteTodoId);
    if (!todoToDelete) {
      setDeleteTodoId(null);
      return;
    }

    // 본인 소유인지 확인
    if (todoToDelete.user_id !== user.id) {
      setErrorMessage("본인의 할 일만 삭제할 수 있습니다.");
      setDeleteTodoId(null);
      return;
    }

    setIsLoadingTodos(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      // Supabase에서 할 일 삭제
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", deleteTodoId)
        .eq("user_id", user.id); // 본인 소유인지 다시 확인

      if (error) {
        console.error("할 일 삭제 오류:", error);
        
        // 인증 오류인 경우
        if (error.code === "PGRST301" || error.message.includes("JWT")) {
          setErrorMessage("인증이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            signOut();
          }, 2000);
          return;
        }

        setErrorMessage("할 일을 삭제하는 중 오류가 발생했습니다.");
        return;
      }

      // 삭제된 항목을 목록에서 제거
      setTodos(todos.filter((todo) => todo.id !== deleteTodoId));
      setDeleteTodoId(null);

      // 목록 다시 조회하여 최신 상태 반영
      await fetchTodos();
    } catch (error) {
      console.error("할 일 삭제 예외:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "할 일을 삭제하는 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoadingTodos(false);
    }
  };

  /**
   * 할 일 완료 상태 토글 핸들러
   * @description 체크박스로 완료/미완료 상태를 토글합니다.
   */
  const handleToggleComplete = async (id: string) => {
    if (!user?.id) {
      setErrorMessage("로그인이 필요합니다.");
      return;
    }

    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    // 본인 소유인지 확인
    if (todo.user_id !== user.id) {
      setErrorMessage("본인의 할 일만 수정할 수 있습니다.");
      return;
    }

    const newCompletedState = !todo.completed;

    // Optimistic UI 업데이트
    setTodos(
      todos.map((t) =>
        t.id === id
          ? { ...t, completed: newCompletedState, updated_at: new Date().toISOString() }
          : t
      )
    );

    try {
      const supabase = createClient();

      // Supabase에서 완료 상태 업데이트
      const { error } = await supabase
        .from("todos")
        .update({
          completed: newCompletedState,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", id)
        .eq("user_id", user.id); // 본인 소유인지 다시 확인

      if (error) {
        console.error("할 일 완료 상태 변경 오류:", error);
        
        // 인증 오류인 경우
        if (error.code === "PGRST301" || error.message.includes("JWT")) {
          setErrorMessage("인증이 만료되었습니다. 다시 로그인해주세요.");
          setTimeout(() => {
            signOut();
          }, 2000);
          // 원래 상태로 되돌리기
          setTodos(todos);
          return;
        }

        // 원래 상태로 되돌리기
        setTodos(todos);
        setErrorMessage("할 일 상태를 변경하는 중 오류가 발생했습니다.");
        return;
      }

      // 목록 다시 조회하여 최신 상태 반영
      await fetchTodos();
    } catch (error) {
      console.error("할 일 완료 상태 변경 예외:", error);
      // 원래 상태로 되돌리기
      setTodos(todos);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "할 일 상태를 변경하는 중 오류가 발생했습니다."
      );
    }
  };


  const filteredTodos = getFilteredAndSortedTodos();

  // 사용자 정보 로딩 중이면 아무것도 표시하지 않음
  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  // 사용자가 없으면 아무것도 표시하지 않음 (리다이렉트 중)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더 */}
      <Header />

      {/* 메인 컨텐츠 */}
      <main className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {/* 툴바 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">할 일 관리</h2>
          <Toolbar filters={filters} onFilterChange={setFilters} />
        </div>

        {/* 에러 메시지 표시 */}
        {errorMessage && (
          <div
            className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-2 underline"
              aria-label="에러 메시지 닫기"
            >
              닫기
            </button>
          </div>
        )}

        <Separator />

        {/* AI 요약 및 분석 섹션 */}
        <AISummarySection />

        <Separator />

        {/* 본문 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 할 일 추가/수정 폼 (좌측 또는 상단) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">
                  {editingTodo ? "할 일 수정" : "새 할 일 추가"}
                </h3>
                <TodoForm
                  initialData={editingTodo}
                  onSubmit={editingTodo ? handleUpdateTodo : handleAddTodo}
                  onCancel={() => setEditingTodo(null)}
                  submitButtonText={editingTodo ? "수정" : "추가"}
                  isLoading={isLoadingTodos}
                />
              </div>
            </div>
          </div>

          {/* 할 일 목록 (우측 또는 하단) */}
          <div className="lg:col-span-2">
            <div className="bg-muted/30 border rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">
                할 일 목록{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({filteredTodos.length}개)
                </span>
              </h3>
              {isLoadingTodos && todos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  로딩 중...
                </div>
              ) : (
                <TodoList
                  todos={filteredTodos}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEditTodo}
                  onDelete={handleDeleteClick}
                  isLoading={isLoadingTodos}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTodoId} onOpenChange={(open) => !open && setDeleteTodoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>할 일 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 할 일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTodoId(null)}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTodo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
