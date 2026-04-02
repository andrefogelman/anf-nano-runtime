import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface UndoAction {
  type: "update" | "create" | "delete";
  table: string;
  itemId: string;
  projectId: string;
  previousData: Record<string, unknown>;
}

const MAX_UNDO_STACK = 10;

export function useUndoStack() {
  const stackRef = useRef<UndoAction[]>([]);
  const queryClient = useQueryClient();

  const push = useCallback((action: UndoAction) => {
    stackRef.current = [
      ...stackRef.current.slice(-(MAX_UNDO_STACK - 1)),
      action,
    ];
  }, []);

  const undo = useCallback(async () => {
    const action = stackRef.current.pop();
    if (!action) {
      toast.info("Nada para desfazer");
      return;
    }

    try {
      switch (action.type) {
        case "update": {
          // Revert fields to their previous values
          const { error } = await supabase
            .from(action.table)
            .update(action.previousData)
            .eq("id", action.itemId);
          if (error) throw error;
          break;
        }
        case "create": {
          // Undo a create = delete the row
          const { error } = await supabase
            .from(action.table)
            .delete()
            .eq("id", action.itemId);
          if (error) throw error;
          break;
        }
        case "delete": {
          // Undo a delete = re-insert with previous data
          const { error } = await supabase
            .from(action.table)
            .insert(action.previousData);
          if (error) throw error;
          break;
        }
      }

      queryClient.invalidateQueries({
        queryKey: ["orcamento", action.projectId],
      });
      toast.success("Ação desfeita");
    } catch (err) {
      console.error("Undo failed:", err);
      toast.error("Erro ao desfazer ação");
      // Push back the action so user can retry
      stackRef.current.push(action);
    }
  }, [queryClient]);

  // Listen for Ctrl+Z
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo]);

  return { push, undo };
}
