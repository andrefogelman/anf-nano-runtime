import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type { AgentConversation } from "@/types/orcamento";

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

      const { error: fnError } = await supabase.functions.invoke("agent-chat", {
        body: {
          project_id: projectId,
          agent_slug: agentSlug,
          message: content,
          context,
        },
      });

      if (fnError) throw fnError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-chat", projectId, agentSlug] });
    },
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
  };
}
