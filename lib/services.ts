import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export const boardService = {
  async getBoards(userId: String) {
    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
      if (error) throw error;

      return data || []; 
  },
};