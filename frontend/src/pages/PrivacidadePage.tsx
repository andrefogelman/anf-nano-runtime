import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Database, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Shield className="h-6 w-6 text-primary" />
          Política de Privacidade — Orcamentista IA
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que coletamos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            <strong>Conta:</strong> nome, e-mail (via Supabase Auth — nunca
            armazenamos sua senha em texto puro).
          </p>
          <p>
            <strong>Projeto:</strong> nome do projeto, cliente, endereço, área e
            arquivos PDF/DXF que você fizer upload.
          </p>
          <p>
            <strong>Uso da IA:</strong> registramos cada pergunta feita às
            plantas em <code>ob_vision_queries</code> com pergunta, resposta,
            custo USD, duração e modelo usado.
          </p>
          <p>
            <strong>Auditoria:</strong> ações sensíveis (export, refresh SINAPI)
            são registradas em <code>ob_audit_log</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="h-4 w-4" />
            Provedores de IA externos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            Para responder perguntas sobre plantas, enviamos os PDFs e a
            pergunta ao provedor selecionado:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>OpenAI</strong> (gpt-5, text-embedding-3-small) —{" "}
              <a
                href="https://openai.com/policies/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                política
              </a>
              . Política API padrão: dados não usados para treinar modelos.
            </li>
            <li>
              <strong>Anthropic</strong> (Claude Sonnet 4.6) —{" "}
              <a
                href="https://www.anthropic.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                política
              </a>
              .
            </li>
            <li>
              <strong>Google</strong> (Gemini 3 Pro) —{" "}
              <a
                href="https://ai.google.dev/gemini-api/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                política
              </a>
              .
            </li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Você escolhe o provedor por pergunta. Cache de resposta é
            armazenado em <code>ob_vision_cache</code> com escopo da sua
            organização.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Onde os dados ficam
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            Banco Postgres + Supabase Storage na região{" "}
            <strong>sa-east-1 (São Paulo)</strong>. RLS (Row Level Security)
            garante que apenas membros da sua organização leem seus dados.
          </p>
          <p>
            Backups diários automáticos. Retenção: enquanto sua conta estiver
            ativa.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4" />
            Apagar tudo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-relaxed">
          <p>
            Você pode apagar um projeto a qualquer momento — isso remove em
            cascade todos os PDFs, quantitativos, itens de orçamento, queries
            vision e itens relacionados (FK <code>ON DELETE CASCADE</code>).
          </p>
          <p>
            Para apagar a conta inteira (org + todos os projetos), entre em
            contato pelo e-mail de suporte. SLA: 30 dias.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Última atualização: 2026-05-15. Esta página será atualizada conforme
        novas integrações forem adicionadas.
      </p>
    </div>
  );
}
