import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { AgentConversation } from "@/types/orcamento";

const ORCABOT_API =
  import.meta.env.VITE_ORCABOT_API_URL || "http://100.66.83.22:8300";
const API_SECRET = import.meta.env.VITE_ORCABOT_API_SECRET || "";

export function useAgentChat(projectId: string, agentSlug = "orcamentista") {
  const queryClient = useQueryClient();

  useRealtimeSubscription({
    table: "ob_agent_conversations",
    filterColumn: "project_id",
    filterValue: projectId,
    queryKeys: [["agent-chat", projectId, agentSlug]],
    enabled: !!projectId,
  });

  const messagesQuery = useQuery({
    queryKey: ["agent-chat", projectId, agentSlug],
    queryFn: async (): Promise<AgentConversation[]> => {
      const { data, error } = await supabase
        .from("ob_agent_conversations")
        .select("*")
        .eq("project_id", projectId)
        .eq("agent_slug", agentSlug)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      context,
    }: {
      content: string;
      context?: Record<string, unknown>;
    }) => {
      // 1. Save user message to DB
      const { error: userMsgError } = await supabase
        .from("ob_agent_conversations")
        .insert({
          project_id: projectId,
          agent_slug: agentSlug,
          role: "user" as const,
          content,
          tool_calls: context ? [{ type: "context", data: context }] : null,
        });

      if (userMsgError) throw userMsgError;

      // 2. Call W5 backend for LLM response
      const res = await fetch(`${ORCABOT_API}/api/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_SECRET}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          agent_slug: agentSlug,
          message: content,
          context,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agent-chat", projectId, agentSlug],
      });
    },
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
  };
}
