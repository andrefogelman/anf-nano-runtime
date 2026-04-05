// supabase/functions/agent-chat/index.ts
// Agent chat — receives a user message, calls LLM with project context, saves response.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LLM_BASE_URL =
  Deno.env.get("ANTHROPIC_BASE_URL") || "https://king.taile4c10f.ts.net";
const LLM_AUTH_TOKEN =
  Deno.env.get("ANTHROPIC_AUTH_TOKEN") || "sk-proxy-passthrough";
const LLM_MODEL = Deno.env.get("LLM_MODEL") || "claude-haiku-4-5-20251001";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  orcamentista: `Você é um engenheiro civil orçamentista senior. Você auxilia o usuário com dúvidas sobre o orçamento, quantitativos, composições SINAPI/TCPO, e qualquer aspecto da obra. Responda em português, de forma técnica mas clara. Use dados do contexto do projeto quando disponível.`,
  estrutural: `Você é um engenheiro estrutural senior. Você auxilia o usuário com dúvidas sobre estrutura, fundações, lajes, vigas, pilares e cálculos estruturais. Responda em português, de forma técnica mas clara.`,
  hidraulico: `Você é um engenheiro hidráulico senior. Você auxilia o usuário com dúvidas sobre instalações hidrossanitárias, tubulações, esgoto, água fria/quente, pluvial, bombas e reservatórios. Responda em português, de forma técnica mas clara.`,
  eletricista: `Você é um engenheiro eletricista senior. Você auxilia o usuário com dúvidas sobre instalações elétricas, quadros, circuitos, iluminação, automação e SPDA. Responda em português, de forma técnica mas clara.`,
};

async function callClaude(
  system: string,
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const res = await fetch(`${LLM_BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": LLM_AUTH_TOKEN,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 4096,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ text?: string }>;
  };
  return data.content?.[0]?.text ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const { project_id, agent_slug, message, context } = body;

    if (!project_id || !agent_slug || !message) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: project_id, agent_slug, message",
        }),
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // 1. Get project info for context
    const { data: project } = await supabase
      .from("ob_projects")
      .select("name, tipo_obra, area_total_m2, uf, cidade")
      .eq("id", project_id)
      .single();

    // 2. Get recent conversation history (last 20 messages)
    const { data: history } = await supabase
      .from("ob_agent_conversations")
      .select("role, content")
      .eq("project_id", project_id)
      .eq("agent_slug", agent_slug)
      .order("created_at", { ascending: true })
      .limit(20);

    // 3. Build context string
    let contextInfo = "";
    if (project) {
      contextInfo += `\nPROJETO: ${project.name} | ${project.tipo_obra} | ${project.area_total_m2}m² | ${project.cidade}/${project.uf}`;
    }
    if (context?.active_tab) {
      contextInfo += `\nAba ativa: ${context.active_tab}`;
    }
    if (context?.active_prancha_id) {
      // Get file info
      const { data: fileData } = await supabase
        .from("ob_project_files")
        .select("filename, file_type, disciplina")
        .eq("id", context.active_prancha_id)
        .single();
      if (fileData) {
        contextInfo += `\nArquivo selecionado: ${fileData.filename} (${fileData.file_type}, disciplina: ${fileData.disciplina || "auto"})`;
      }
    }

    // 4. Build system prompt
    const basePrompt =
      AGENT_SYSTEM_PROMPTS[agent_slug] ?? AGENT_SYSTEM_PROMPTS.orcamentista;
    const systemPrompt = contextInfo
      ? `${basePrompt}\n\nCONTEXTO ATUAL:${contextInfo}`
      : basePrompt;

    // 5. Build messages array from history
    const llmMessages: Array<{ role: string; content: string }> = [];
    for (const msg of history ?? []) {
      if (msg.role === "user" || msg.role === "assistant") {
        llmMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // 6. Call LLM
    const response = await callClaude(systemPrompt, llmMessages);

    // 7. Save assistant response
    const { error: insertError } = await supabase
      .from("ob_agent_conversations")
      .insert({
        project_id,
        agent_slug,
        role: "assistant",
        content: response,
      });

    if (insertError) {
      console.error("Failed to save response:", insertError.message);
    }

    return new Response(
      JSON.stringify({ ok: true, response }),
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("agent-chat error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: CORS_HEADERS },
    );
  }
});
