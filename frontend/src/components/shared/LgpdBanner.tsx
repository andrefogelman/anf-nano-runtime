import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "orcabot:lgpd-consent";

export function LgpdBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShow(localStorage.getItem(STORAGE_KEY) !== "1");
  }, []);

  const aceitar = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center">
        <Shield className="h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1 text-sm">
          <strong>Privacidade e LGPD.</strong> Os PDFs de planta que você envia
          são processados por modelos de IA (OpenAI, Anthropic, Google).
          Detalhes em{" "}
          <Link
            to="/privacidade"
            className="text-primary underline underline-offset-2"
          >
            política de privacidade
          </Link>
          .
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={aceitar}>
            Entendi
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={aceitar}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
