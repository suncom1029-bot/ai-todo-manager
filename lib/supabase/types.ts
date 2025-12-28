/**
 * Supabase Database 타입 정의
 * @description Supabase에서 생성한 타입을 여기에 추가합니다.
 * 
 * 타입 생성 명령어:
 * npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
 */

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
      };
      todos: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          priority: "high" | "medium" | "low";
          category: string;
          completed: boolean;
          due_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          priority?: "high" | "medium" | "low";
          category?: string;
          completed?: boolean;
          due_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          priority?: "high" | "medium" | "low";
          category?: string;
          completed?: boolean;
          due_date?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

