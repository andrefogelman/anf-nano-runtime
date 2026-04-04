import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot, User, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCadernoQuery } from "@/hooks/useCadernos";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; page?: number; source_file?: string }>;
  timestamp: Date;
}

interface CadernoChatProps {
  onOpenPdf?: (sourceFile: string, title: string, page?: number) => void;
}

const EXAMPLE_QUESTIONS = [
  "Qual o critério de medição para alvenaria de vedação?",
  "Como se calcula o BDI para obras públicas?",
  "Quais os tipos de fundação e quando usar cada um?",
  "Como é feito o levantamento de quantitativos para pintura?",
  "Qual a composição de custos para concreto armado?",
];

export function CadernoChat({ onOpenPdf }: CadernoChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: queryAI, isPending } = useCadernoQuery();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(
    (text?: string) => {
      const question = (text || input).trim();
      if (!question || isPending) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      queryAI(
        { question },
        {
          onSuccess: (data) => {
            const aiMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.answer,
              sources: data.sources,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMsg]);
          },
          onError: (err) => {
            const errorMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.\n\nErro: ${err.message}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
          },
        },
      );
    },
    [input, isPending, queryAI],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Assistente SINAPI</h2>
            <p className="text-xs text-muted-foreground">
              Pergunte sobre os cadernos técnicos
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/5 mb-4">
                <Bot className="h-8 w-8 text-primary/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Comece uma conversa
              </p>
              <p className="text-xs text-muted-foreground mb-4 max-w-[280px]">
                Faça perguntas sobre metodologias, composições e critérios dos
                Cadernos Técnicos SINAPI.
              </p>
              <div className="space-y-2 w-full max-w-[360px]">
                {EXAMPLE_QUESTIONS.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {msg.role === "assistant" && (
                <div className="flex items-start shrink-0">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md",
                )}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/40 space-y-1.5">
                    <p className="text-xs font-medium opacity-70">Fontes:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, i) => (
                        <Badge
                          key={`${src.title}-${i}`}
                          variant="secondary"
                          className="gap-1 cursor-pointer hover:bg-secondary/80 text-xs"
                          onClick={() =>
                            onOpenPdf?.(src.source_file || "", src.title, src.page)
                          }
                        >
                          <FileText className="h-3 w-3" />
                          {src.title}
                          {src.page != null && (
                            <span className="opacity-60">p.{src.page}</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="flex items-start shrink-0">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary">
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isPending && (
            <div className="flex gap-2 justify-start">
              <div className="flex items-start shrink-0">
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Consultando cadernos...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-background">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre os cadernos técnicos..."
            className="flex-1 resize-none rounded-xl border bg-muted/30 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[42px] max-h-[120px]"
            rows={1}
            disabled={isPending}
          />
          <Button
            size="icon"
            className="h-[42px] w-[42px] rounded-xl shrink-0"
            onClick={() => handleSend()}
            disabled={isPending || !input.trim()}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
