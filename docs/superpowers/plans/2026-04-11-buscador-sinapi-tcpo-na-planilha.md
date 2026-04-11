# Buscador SINAPI/TCPO na Planilha — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um botão por linha na planilha do OrcaBot que abre um modal com tabs SINAPI/TCPO, busca pré-preenchida com a descrição do item, e permite aplicar o preço de referência preenchendo `custo_unitario`, `custo_material`, `custo_mao_obra`, `custo_total`, `fonte`, `fonte_codigo`, `fonte_data_base`.

**Architecture:** Lógica pura em `lib/unit.ts` e `lib/price-source.ts` (testável com `bun test`). Hook `useApplyPriceSource` encapsula o fluxo completo (fetch TCPO insumos se necessário + updateItem + retorno de snapshot para undo). Componente `PriceSourceDialog` hospedado no `BudgetTable` (1 instância compartilhada), acionado pelo botão em cada `BudgetRow`. Undo via tipo `"update"` já existente no `useUndoStack`.

**Tech Stack:** React + TypeScript + Vite (frontend), Supabase Postgres (backend), shadcn/ui (Dialog + Tabs — já instalados), `@tanstack/react-query`, `bun test` para testes unitários.

**Design doc:** `docs/superpowers/specs/2026-04-11-buscador-sinapi-tcpo-na-planilha-design.md`

---

## Pré-requisitos e convenções

- Todo trabalho a partir de `/Users/andrefogelman/orcabot`
- Frontend é o diretório `frontend/` — todos os `bun` commands rodam de dentro dele
- Deps já instaladas (`bun install` de tarefa anterior — não precisa rodar novamente a menos que falhe import)
- Sem migrations, sem backend
- **NÃO** rodar `npx vercel --prod --yes` no final — git push dispara deploy automático no projeto "orcabot" via git integration (o `.vercel/project.json` local aponta para um projeto separado "frontend" que NÃO serve `anfconstrucoes.com.br`)
- Frontend usa path alias `@/` → `src/` via `tsconfig.json`; bun respeita sem configuração adicional
- Não há setup de teste prévio — `bun test src/lib/<file>.test.ts` roda direto, bun resolve `@/` do tsconfig
- Arquivos de teste existentes para referência de style: `frontend/src/lib/eap.test.ts` (criado anteriormente)
- Tipos:
  - `OrcamentoItem` de `@/types/orcamento`
  - `SinapiComposicao` exportado de `@/hooks/useSinapi`
  - `TcpoComposicao` e `TcpoInsumo` exportados de `@/hooks/useTcpo`
- Shadcn primitives existentes em `frontend/src/components/ui/`: `dialog.tsx`, `tabs.tsx`, `input.tsx`, `button.tsx`, `badge.tsx`, `scroll-area.tsx`, `select.tsx`
- Erros de typecheck pré-existentes (NÃO tocar): `PranchaList.tsx`, `PremissasTab.tsx`, `QuantitativosTab.tsx`, `useOrcamento.ts` — foram discutidos em sessão anterior

---

## Task 1: `lib/unit.ts` — normalização de unidades

**Files:**
- Create: `frontend/src/lib/unit.ts`
- Create: `frontend/src/lib/unit.test.ts`

**Goal:** Helper puro para comparar unidades com grafias diferentes (`m²` ≡ `m2`, `und` ≡ `un`, etc).

- [ ] **Step 1: Criar `frontend/src/lib/unit.ts`**

```ts
/**
 * Normaliza grafia de unidade para comparação.
 * Exemplos: "m²" → "m2", "M²" → "m2", "und" → "un", "kg " → "kg"
 */
export function normalizeUnit(u: string | null | undefined): string {
  if (!u) return "";
  return u
    .trim()
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/^und$/, "un")
    .replace(/^unid$/, "un");
}

/** Compara duas unidades depois de normalizar. */
export function unitsMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  return normalizeUnit(a) === normalizeUnit(b);
}
```

- [ ] **Step 2: Criar `frontend/src/lib/unit.test.ts`**

```ts
import { describe, test, expect } from "bun:test";
import { normalizeUnit, unitsMatch } from "./unit";

describe("normalizeUnit", () => {
  test("null/undefined/empty → ''", () => {
    expect(normalizeUnit(null)).toBe("");
    expect(normalizeUnit(undefined)).toBe("");
    expect(normalizeUnit("")).toBe("");
  });

  test("m² variations → 'm2'", () => {
    expect(normalizeUnit("m²")).toBe("m2");
    expect(normalizeUnit("M²")).toBe("m2");
    expect(normalizeUnit("m2")).toBe("m2");
    expect(normalizeUnit("M2")).toBe("m2");
  });

  test("m³ variations → 'm3'", () => {
    expect(normalizeUnit("m³")).toBe("m3");
    expect(normalizeUnit("M³")).toBe("m3");
    expect(normalizeUnit("m3")).toBe("m3");
  });

  test("trim whitespace", () => {
    expect(normalizeUnit(" kg ")).toBe("kg");
    expect(normalizeUnit("\tkg\n")).toBe("kg");
  });

  test("und/unid → 'un'", () => {
    expect(normalizeUnit("und")).toBe("un");
    expect(normalizeUnit("UND")).toBe("un");
    expect(normalizeUnit("Unid")).toBe("un");
    expect(normalizeUnit("unid")).toBe("un");
    expect(normalizeUnit("un")).toBe("un");
  });

  test("idempotent", () => {
    expect(normalizeUnit(normalizeUnit("M²"))).toBe("m2");
  });
});

describe("unitsMatch", () => {
  test("equal normalized", () => {
    expect(unitsMatch("m²", "m2")).toBe(true);
    expect(unitsMatch("M²", "m2")).toBe(true);
    expect(unitsMatch("und", "un")).toBe(true);
    expect(unitsMatch("kg", "KG")).toBe(true);
  });

  test("different", () => {
    expect(unitsMatch("m2", "m3")).toBe(false);
    expect(unitsMatch("kg", "un")).toBe(false);
  });

  test("null handling", () => {
    expect(unitsMatch(null, null)).toBe(true); // both empty
    expect(unitsMatch("kg", null)).toBe(false);
  });
});
```

- [ ] **Step 3: Rodar os testes**

```bash
cd /Users/andrefogelman/orcabot/frontend
bun test src/lib/unit.test.ts
```

Expected: todos os testes passam (≈15 tests).

- [ ] **Step 4: Commit**

```bash
cd /Users/andrefogelman/orcabot
git add frontend/src/lib/unit.ts frontend/src/lib/unit.test.ts
git commit -m "feat(unit): pure helpers for unit normalization and matching

Used by PriceSourceDialog to highlight SINAPI/TCPO results whose
unit matches the budget line unit (m² ≡ m2, und ≡ un, etc).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `lib/price-source.ts` — cálculo de split TCPO

**Files:**
- Create: `frontend/src/lib/price-source.ts`
- Create: `frontend/src/lib/price-source.test.ts`

**Goal:** Função pura que divide um `custo_unitario` TCPO entre material (MAT+EQH) e mão de obra (MOD), proporcionalmente à soma dos `total` dos insumos.

- [ ] **Step 1: Criar `frontend/src/lib/price-source.ts`**

```ts
export type TcpoInsumoLite = {
  classe: "MOD" | "MAT" | "EQH";
  total: number | null;
};

export type PriceSplit = {
  custo_unitario: number;
  custo_material: number;
  custo_mao_obra: number;
};

/**
 * Dado o custo_unitario final de uma composição TCPO (custo_com_taxas)
 * e a lista de insumos, calcula a divisão entre material e mão de obra
 * proporcionalmente à soma dos totais dos insumos.
 *
 * Regras:
 * - MOD → mão de obra
 * - MAT + EQH → material
 * - Se insumos somam 0 ou vazios, fallback: tudo em material
 *
 * O custo_unitario final é preservado: custo_material + custo_mao_obra === custo_unitario.
 * Isso importa porque soma dos insumos ≠ custo_com_taxas (LS + BDI).
 */
export function computeTcpoSplit(
  custoUnitario: number,
  insumos: TcpoInsumoLite[]
): PriceSplit {
  const mod = insumos
    .filter((i) => i.classe === "MOD")
    .reduce((s, i) => s + (i.total ?? 0), 0);
  const matEqh = insumos
    .filter((i) => i.classe === "MAT" || i.classe === "EQH")
    .reduce((s, i) => s + (i.total ?? 0), 0);
  const soma = mod + matEqh;

  if (soma <= 0) {
    return {
      custo_unitario: custoUnitario,
      custo_material: custoUnitario,
      custo_mao_obra: 0,
    };
  }

  const fracMod = mod / soma;
  return {
    custo_unitario: custoUnitario,
    custo_mao_obra: custoUnitario * fracMod,
    custo_material: custoUnitario * (1 - fracMod),
  };
}
```

- [ ] **Step 2: Criar `frontend/src/lib/price-source.test.ts`**

```ts
import { describe, test, expect } from "bun:test";
import { computeTcpoSplit, type TcpoInsumoLite } from "./price-source";

describe("computeTcpoSplit", () => {
  test("empty insumos → all in material", () => {
    const r = computeTcpoSplit(100, []);
    expect(r).toEqual({
      custo_unitario: 100,
      custo_material: 100,
      custo_mao_obra: 0,
    });
  });

  test("insumos all with total 0 → all in material", () => {
    const insumos: TcpoInsumoLite[] = [
      { classe: "MOD", total: 0 },
      { classe: "MAT", total: 0 },
    ];
    const r = computeTcpoSplit(100, insumos);
    expect(r.custo_material).toBe(100);
    expect(r.custo_mao_obra).toBe(0);
  });

  test("only MOD → all in mao_obra", () => {
    const insumos: TcpoInsumoLite[] = [
      { classe: "MOD", total: 50 },
      { classe: "MOD", total: 30 },
    ];
    const r = computeTcpoSplit(100, insumos);
    expect(r.custo_mao_obra).toBe(100);
    expect(r.custo_material).toBe(0);
  });

  test("only MAT → all in material", () => {
    const insumos: TcpoInsumoLite[] = [{ classe: "MAT", total: 80 }];
    const r = computeTcpoSplit(100, insumos);
    expect(r.custo_material).toBe(100);
    expect(r.custo_mao_obra).toBe(0);
  });

  test("only EQH → all in material (EQH treated as material)", () => {
    const insumos: TcpoInsumoLite[] = [{ classe: "EQH", total: 50 }];
    const r = computeTcpoSplit(100, insumos);
    expect(r.custo_material).toBe(100);
    expect(r.custo_mao_obra).toBe(0);
  });

  test("50/50 MOD/MAT → half split", () => {
    const insumos: TcpoInsumoLite[] = [
      { classe: "MOD", total: 50 },
      { classe: "MAT", total: 50 },
    ];
    const r = computeTcpoSplit(200, insumos);
    expect(r.custo_mao_obra).toBe(100);
    expect(r.custo_material).toBe(100);
  });

  test("30/70 MOD/(MAT+EQH) → 30/70 split", () => {
    const insumos: TcpoInsumoLite[] = [
      { classe: "MOD", total: 30 },
      { classe: "MAT", total: 40 },
      { classe: "EQH", total: 30 },
    ];
    const r = computeTcpoSplit(100, insumos);
    expect(r.custo_mao_obra).toBeCloseTo(30, 5);
    expect(r.custo_material).toBeCloseTo(70, 5);
  });

  test("custo_unitario differs from sum of insumos (LS/BDI applied)", () => {
    // Insumos somam 100, mas custo_com_taxas é 125 (25% BDI/LS). Split proporcional preserva 125 total.
    const insumos: TcpoInsumoLite[] = [
      { classe: "MOD", total: 40 },
      { classe: "MAT", total: 60 },
    ];
    const r = computeTcpoSplit(125, insumos);
    expect(r.custo_unitario).toBe(125);
    expect(r.custo_mao_obra).toBeCloseTo(50, 5); // 40/100 * 125
    expect(r.custo_material).toBeCloseTo(75, 5); // 60/100 * 125
    expect(r.custo_mao_obra + r.custo_material).toBeCloseTo(125, 5);
  });

  test("null totals treated as 0", () => {
    const insumos: TcpoInsumoLite[] = [
      { classe: "MOD", total: null },
      { classe: "MAT", total: 50 },
    ];
    const r = computeTcpoSplit(100, insumos);
    expect(r.custo_material).toBe(100);
    expect(r.custo_mao_obra).toBe(0);
  });
});
```

- [ ] **Step 3: Rodar os testes**

```bash
cd /Users/andrefogelman/orcabot/frontend
bun test src/lib/price-source.test.ts
```

Expected: todos os 9 testes passam.

- [ ] **Step 4: Commit**

```bash
cd /Users/andrefogelman/orcabot
git add frontend/src/lib/price-source.ts frontend/src/lib/price-source.test.ts
git commit -m "feat(price-source): pure TCPO split computation

Calculates material (MAT+EQH) / mão de obra (MOD) split of a
composition cost proportionally to insumo totals. Preserves
custo_unitario exactly (LS/BDI differ from raw insumo sum).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Hook `useApplyPriceSource`

**Files:**
- Create: `frontend/src/hooks/useApplyPriceSource.ts`

**Goal:** Hook que, dado um `{ item, selection }`, busca insumos TCPO (se aplicável), calcula os custos finais e aplica via `updateItem`. Retorna `{ previousData }` para quem chama poder empurrar no undoStack.

- [ ] **Step 1: Criar `frontend/src/hooks/useApplyPriceSource.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUpdateOrcamentoItem } from "./useOrcamento";
import { computeTcpoSplit, type TcpoInsumoLite } from "@/lib/price-source";
import type { OrcamentoItem } from "@/types/orcamento";
import type { SinapiComposicao } from "./useSinapi";
import type { TcpoComposicao } from "./useTcpo";

export type PriceSelection =
  | { kind: "sinapi"; composicao: SinapiComposicao }
  | { kind: "tcpo"; composicao: TcpoComposicao };

export type PreviousPriceData = {
  custo_unitario: number | null;
  custo_material: number | null;
  custo_mao_obra: number | null;
  custo_total: number | null;
  fonte: string | null;
  fonte_codigo: string | null;
  fonte_data_base: string | null;
};

export type ApplyResult = {
  previousData: PreviousPriceData;
};

export function useApplyPriceSource() {
  const updateItem = useUpdateOrcamentoItem();

  return useMutation<
    ApplyResult,
    Error,
    { item: OrcamentoItem; selection: PriceSelection }
  >({
    mutationFn: async ({ item, selection }) => {
      const qty = item.quantidade ?? 0;

      let custo_unitario: number;
      let custo_material: number;
      let custo_mao_obra: number;
      let fonte: "sinapi" | "tcpo";
      let fonte_codigo: string;
      let fonte_data_base: string;

      if (selection.kind === "sinapi") {
        custo_unitario = selection.composicao.custo_sem_desoneracao ?? 0;
        custo_material = 0;
        custo_mao_obra = 0;
        fonte = "sinapi";
        fonte_codigo = selection.composicao.codigo;
        fonte_data_base = selection.composicao.data_base;
      } else {
        const { data: insumos, error } = await supabase
          .from("ob_tcpo_insumos")
          .select("classe, total")
          .eq("composicao_id", selection.composicao.id);
        if (error) throw error;

        const split = computeTcpoSplit(
          selection.composicao.custo_com_taxas ?? 0,
          (insumos ?? []) as TcpoInsumoLite[]
        );
        custo_unitario = split.custo_unitario;
        custo_material = split.custo_material;
        custo_mao_obra = split.custo_mao_obra;
        fonte = "tcpo";
        fonte_codigo = selection.composicao.codigo;
        fonte_data_base = selection.composicao.data_precos;
      }

      const custo_total = custo_unitario * qty;

      const previousData: PreviousPriceData = {
        custo_unitario: item.custo_unitario,
        custo_material: item.custo_material,
        custo_mao_obra: item.custo_mao_obra,
        custo_total: item.custo_total,
        fonte: item.fonte,
        fonte_codigo: item.fonte_codigo,
        fonte_data_base: item.fonte_data_base,
      };

      await updateItem.mutateAsync({
        id: item.id,
        projectId: item.project_id,
        custo_unitario,
        custo_material,
        custo_mao_obra,
        custo_total,
        fonte,
        fonte_codigo,
        fonte_data_base,
      });

      return { previousData };
    },
  });
}
```

- [ ] **Step 2: Typecheck apenas deste arquivo**

```bash
cd /Users/andrefogelman/orcabot/frontend
bun run typecheck 2>&1 | grep "useApplyPriceSource" || echo "CLEAN"
```

Expected: "CLEAN". Se houver erro, ler a mensagem e ajustar (provável causa: tipo de `insumos` do supabase query precisa cast explícito, que já está no código acima).

- [ ] **Step 3: Commit**

```bash
cd /Users/andrefogelman/orcabot
git add frontend/src/hooks/useApplyPriceSource.ts
git commit -m "feat(orcamento): useApplyPriceSource hook

Applies a SINAPI or TCPO composition as the price source for an
orcamento item. TCPO branch fetches ob_tcpo_insumos and calls
computeTcpoSplit. Returns previousData so caller can push to undoStack.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Componente `PriceSourceDialog` — estrutura base

**Files:**
- Create: `frontend/src/components/planilha/PriceSourceDialog.tsx`

**Goal:** Dialog shadcn com header, campo de busca pré-preenchido, tabs SINAPI/TCPO, área vazia para resultados (a serem implementados em Task 5). Estado interno de query, tab ativa, seleção.

Este task cria o scaffold. Tasks 5 e 6 preenchem as tabs com os resultados reais. Comita após cada task para permitir rollback fácil.

- [ ] **Step 1: Criar `frontend/src/components/planilha/PriceSourceDialog.tsx`**

```tsx
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { OrcamentoItem } from "@/types/orcamento";
import type { PriceSelection } from "@/hooks/useApplyPriceSource";
import { useApplyPriceSource } from "@/hooks/useApplyPriceSource";
import { toast } from "sonner";

interface PriceSourceDialogProps {
  item: OrcamentoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied?: (args: {
    item: OrcamentoItem;
    previousData: import("@/hooks/useApplyPriceSource").PreviousPriceData;
  }) => void;
}

export function PriceSourceDialog({
  item,
  open,
  onOpenChange,
  onApplied,
}: PriceSourceDialogProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"sinapi" | "tcpo">("sinapi");
  const [selected, setSelected] = useState<PriceSelection | null>(null);
  const apply = useApplyPriceSource();

  // Reset state when item changes (new row clicked)
  useEffect(() => {
    if (item && open) {
      setQuery(item.descricao ?? "");
      setSelected(null);
      setTab("sinapi");
    }
  }, [item, open]);

  const handleApply = async () => {
    if (!item || !selected) return;
    try {
      const result = await apply.mutateAsync({ item, selection: selected });
      onApplied?.({ item, previousData: result.previousData });
      onOpenChange(false);
      toast.success("Preço aplicado");
    } catch (err) {
      console.error("apply price source failed:", err);
      toast.error("Erro ao aplicar preço");
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Buscar preço de referência</DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">
            <span className="font-medium">{item.eap_code}</span> — {item.descricao}
            {item.unidade && (
              <> · Unidade: <span className="font-medium">{item.unidade}</span></>
            )}
            {item.quantidade != null && (
              <> · Quantidade: <span className="font-medium">{item.quantidade}</span></>
            )}
          </div>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar composição..."
            className="pl-9 pr-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-muted"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as "sinapi" | "tcpo")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sinapi">SINAPI</TabsTrigger>
            <TabsTrigger value="tcpo">TCPO</TabsTrigger>
          </TabsList>
          <TabsContent value="sinapi" className="mt-2">
            <div className="text-sm text-muted-foreground py-8 text-center">
              Lista SINAPI — a ser implementada
            </div>
          </TabsContent>
          <TabsContent value="tcpo" className="mt-2">
            <div className="text-sm text-muted-foreground py-8 text-center">
              Lista TCPO — a ser implementada
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selected || apply.isPending}
          >
            {apply.isPending ? "Aplicando..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/andrefogelman/orcabot/frontend
bun run typecheck 2>&1 | grep "PriceSourceDialog" || echo "CLEAN"
```

Expected: "CLEAN". Se falhar, investigar — pode ser exports do shadcn dialog diferentes do esperado. Se `DialogFooter` não existir, abrir `frontend/src/components/ui/dialog.tsx` e usar o que está disponível (geralmente `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` são os padrão). Se `Tabs` tem nome diferente, abrir `tabs.tsx`.

- [ ] **Step 3: Commit**

```bash
cd /Users/andrefogelman/orcabot
git add frontend/src/components/planilha/PriceSourceDialog.tsx
git commit -m "feat(planilha): PriceSourceDialog scaffold (search + tabs)

Dialog with pre-filled search, SINAPI/TCPO tabs, and apply flow.
Tab content is placeholder — filled in next tasks.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `PriceSourceDialog` — lista SINAPI

**Files:**
- Modify: `frontend/src/components/planilha/PriceSourceDialog.tsx`

**Goal:** Substituir o placeholder da tab SINAPI por uma lista paginada real com destaque de unidade e seleção clicável.

- [ ] **Step 1: Criar sub-componente `SinapiResultsList` dentro do mesmo arquivo**

Adicionar no mesmo arquivo `PriceSourceDialog.tsx`, abaixo do componente principal (ou extrair se preferir — para este plano mantém no mesmo arquivo por simplicidade, 1 arquivo < 400 linhas):

```tsx
import { useSinapiSearch, type SinapiComposicao } from "@/hooks/useSinapi";
import { Badge } from "@/components/ui/badge";
import { unitsMatch } from "@/lib/unit";
import { cn } from "@/lib/utils";
```

(adicionar esses imports junto dos existentes no topo)

E no final do arquivo, antes do fechamento:

```tsx
interface SinapiResultsListProps {
  query: string;
  itemUnit: string | null;
  selected: PriceSelection | null;
  onSelect: (sel: PriceSelection) => void;
}

function SinapiResultsList({
  query,
  itemUnit,
  selected,
  onSelect,
}: SinapiResultsListProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useSinapiSearch(query, null, null, page, 50);

  // Reset page when query changes
  useEffect(() => {
    setPage(1);
  }, [query]);

  if (isLoading && !data) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Buscando...</div>;
  }
  if (error) {
    return <div className="py-8 text-center text-sm text-destructive">Erro ao buscar SINAPI</div>;
  }

  const results = data?.data ?? [];
  // Sort: rows with matching unit first, rest preserve server order
  const sorted = [...results].sort((a, b) => {
    const am = unitsMatch(a.unidade, itemUnit) ? 0 : 1;
    const bm = unitsMatch(b.unidade, itemUnit) ? 0 : 1;
    return am - bm;
  });

  return (
    <div className="max-h-[420px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b">
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-24 px-2 py-2">Código</th>
            <th className="px-2 py-2">Descrição</th>
            <th className="w-16 px-2 py-2">Unid</th>
            <th className="w-28 px-2 py-2 text-right">Custo s/ desoneração</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((comp) => {
            const isSelected =
              selected?.kind === "sinapi" && selected.composicao.id === comp.id;
            const isMatch = unitsMatch(comp.unidade, itemUnit);
            return (
              <tr
                key={comp.id}
                className={cn(
                  "cursor-pointer border-b hover:bg-accent",
                  isSelected && "bg-primary/10"
                )}
                onClick={() => onSelect({ kind: "sinapi", composicao: comp })}
                onDoubleClick={() =>
                  onSelect({ kind: "sinapi", composicao: comp })
                }
              >
                <td className="px-2 py-1.5 font-mono text-xs">{comp.codigo}</td>
                <td className="px-2 py-1.5">{comp.descricao}</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <span>{comp.unidade}</span>
                    {isMatch && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        ✓
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  R$ {(comp.custo_sem_desoneracao ?? 0).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhum resultado
        </div>
      )}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-2 py-2 text-xs text-muted-foreground">
          <span>
            Página {page} de {data.totalPages} ({data.count} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Substituir o placeholder da tab SINAPI** no componente principal

Trocar:
```tsx
          <TabsContent value="sinapi" className="mt-2">
            <div className="text-sm text-muted-foreground py-8 text-center">
              Lista SINAPI — a ser implementada
            </div>
          </TabsContent>
```

Por:
```tsx
          <TabsContent value="sinapi" className="mt-2">
            <SinapiResultsList
              query={query}
              itemUnit={item.unidade}
              selected={selected}
              onSelect={setSelected}
            />
          </TabsContent>
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/andrefogelman/orcabot/frontend
bun run typecheck 2>&1 | grep "PriceSourceDialog" || echo "CLEAN"
```

Expected: "CLEAN". Se `SinapiComposicao` não estiver exportado em `useSinapi.ts`, verificar (já vi no código que está exportado na linha 4 do hook).

- [ ] **Step 4: Commit**

```bash
cd /Users/andrefogelman/orcabot
git add frontend/src/components/planilha/PriceSourceDialog.tsx
git commit -m "feat(planilha): SINAPI tab with paginated results

Paginated table with unit-match highlight, click to select,
double-click equivalent. Uses existing useSinapiSearch hook.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `PriceSourceDialog` — lista TCPO

**Files:**
- Modify: `frontend/src/components/planilha/PriceSourceDialog.tsx`

**Goal:** Implementar a tab TCPO espelhando SINAPI mas sem paginação (TCPO total é 1.272 e o hook `useTcpoSearch` já faz limit 100 internamente).

- [ ] **Step 1: Adicionar o import**

No topo do arquivo, junto com os outros imports:

```tsx
import { useTcpoSearch, type TcpoComposicao } from "@/hooks/useTcpo";
```

- [ ] **Step 2: Adicionar o sub-componente `TcpoResultsList` no final do arquivo**

```tsx
interface TcpoResultsListProps {
  query: string;
  itemUnit: string | null;
  selected: PriceSelection | null;
  onSelect: (sel: PriceSelection) => void;
}

function TcpoResultsList({
  query,
  itemUnit,
  selected,
  onSelect,
}: TcpoResultsListProps) {
  const { data, isLoading, error } = useTcpoSearch(query, null);

  if (isLoading && !data) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Buscando...</div>;
  }
  if (error) {
    return <div className="py-8 text-center text-sm text-destructive">Erro ao buscar TCPO</div>;
  }

  const results = data ?? [];
  const sorted = [...results].sort((a, b) => {
    const am = unitsMatch(a.unidade, itemUnit) ? 0 : 1;
    const bm = unitsMatch(b.unidade, itemUnit) ? 0 : 1;
    return am - bm;
  });

  return (
    <div className="max-h-[420px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b">
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-24 px-2 py-2">Código</th>
            <th className="px-2 py-2">Descrição</th>
            <th className="w-16 px-2 py-2">Unid</th>
            <th className="w-28 px-2 py-2 text-right">Custo c/ taxas</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((comp) => {
            const isSelected =
              selected?.kind === "tcpo" && selected.composicao.id === comp.id;
            const isMatch = unitsMatch(comp.unidade, itemUnit);
            return (
              <tr
                key={comp.id}
                className={cn(
                  "cursor-pointer border-b hover:bg-accent",
                  isSelected && "bg-primary/10"
                )}
                onClick={() => onSelect({ kind: "tcpo", composicao: comp })}
                onDoubleClick={() =>
                  onSelect({ kind: "tcpo", composicao: comp })
                }
              >
                <td className="px-2 py-1.5 font-mono text-xs">{comp.codigo}</td>
                <td className="px-2 py-1.5">{comp.descricao}</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <span>{comp.unidade}</span>
                    {isMatch && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        ✓
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  R$ {(comp.custo_com_taxas ?? 0).toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhum resultado
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Substituir o placeholder da tab TCPO**

Trocar:
```tsx
          <TabsContent value="tcpo" className="mt-2">
            <div className="text-sm text-muted-foreground py-8 text-center">
              Lista TCPO — a ser implementada
            </div>
          </TabsContent>
```

Por:
```tsx
          <TabsContent value="tcpo" className="mt-2">
            <TcpoResultsList
              query={query}
              itemUnit={item.unidade}
              selected={selected}
              onSelect={setSelected}
            />
          </TabsContent>
```

- [ ] **Step 4: Typecheck**

```bash
cd /Users/andrefogelman/orcabot/frontend
bun run typecheck 2>&1 | grep "PriceSourceDialog" || echo "CLEAN"
```

Expected: "CLEAN".

- [ ] **Step 5: Commit**

```bash
cd /Users/andrefogelman/orcabot
git add frontend/src/components/planilha/PriceSourceDialog.tsx
git commit -m "feat(planilha): TCPO tab with unit-match highlighting

Mirror of SINAPI tab but without pagination (1272 total, hook limits 100).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Integrar no `BudgetRow` e `BudgetTable`

**Files:**
- Modify: `frontend/src/components/planilha/BudgetRow.tsx`
- Modify: `frontend/src/components/planilha/BudgetTable.tsx`

**Goal:** Adicionar o botão na linha que chama um callback do pai, e fazer o `BudgetTable` hospedar o único `<PriceSourceDialog>` compartilhado. Ao aplicar, push no undoStack.

- [ ] **Step 1: Atualizar `BudgetRowProps` em `BudgetRow.tsx`**

Adicionar a prop `onFindPriceSource` na interface, junto com o import de um ícone novo:

No topo, trocar:
```tsx
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
```

Por:
```tsx
import { ChevronDown, ChevronRight, Trash2, BookOpen } from "lucide-react";
```

Atualizar a interface `BudgetRowProps` (linha 8):

```tsx
interface BudgetRowProps {
  item: OrcamentoItem;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onUpdate: (field: keyof OrcamentoItem, value: string | number) => void;
  onDelete: (item: OrcamentoItem) => void;
  onContextMenu: (e: React.MouseEvent, item: OrcamentoItem) => void;
  onFindPriceSource: (item: OrcamentoItem) => void;
}
```

Desestruturar `onFindPriceSource` na assinatura do componente:

```tsx
export function BudgetRow({
  item,
  isExpanded,
  hasChildren,
  onToggle,
  onUpdate,
  onDelete,
  onContextMenu,
  onFindPriceSource,
}: BudgetRowProps) {
```

- [ ] **Step 2: Adicionar o botão na última `<td>` (a que contém o Trash2)**

Localizar o `<td>` que envolve o botão de trash (próximo à linha 158-171 no estado atual). Adicionar o novo botão **antes** do botão de trash, dentro do mesmo wrapper. Alteração:

Substituir o bloco do trash button (de `{confirmDelete ? (` até o `</td>` final) — manter o comportamento de confirm delete intacto — e adicionar um novo botão `BookOpen` que sempre aparece (não depende de `group-hover`), à esquerda:

Primeiro, localize o wrapper `<td className="w-20 border-r px-2 py-1">` do Trash (última `<td>`). Dentro dele tem um `<div className="flex items-center gap-1">` que contém o botão de delete (com estado `confirmDelete`). Adicione um novo botão antes do bloco condicional `{confirmDelete ? ... : ...}`:

```tsx
<button
  className="p-0.5 rounded hover:bg-accent"
  title="Buscar preço SINAPI/TCPO"
  onClick={(e) => {
    e.stopPropagation();
    onFindPriceSource(item);
  }}
>
  <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
</button>
```

O resultado do `<td>` final deve ficar parecido com (mantendo todo o código existente):

```tsx
<td className="w-20 border-r px-2 py-1">
  <div className="flex items-center gap-1">
    <button
      className="p-0.5 rounded hover:bg-accent"
      title="Buscar preço SINAPI/TCPO"
      onClick={(e) => {
        e.stopPropagation();
        onFindPriceSource(item);
      }}
    >
      <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
    </button>
    {confirmDelete ? (
      // ... existing confirm delete buttons ...
    ) : (
      // ... existing trash button ...
    )}
  </div>
</td>
```

- [ ] **Step 3: No `BudgetTable.tsx`, adicionar estado e render do Dialog**

No topo do arquivo, adicionar imports:

```tsx
import { PriceSourceDialog } from "./PriceSourceDialog";
import type { PreviousPriceData } from "@/hooks/useApplyPriceSource";
```

Adicionar o estado do dialog dentro do componente `BudgetTable` (perto dos outros `useState`):

```tsx
  const [priceSourceItem, setPriceSourceItem] = useState<OrcamentoItem | null>(null);
```

Adicionar o callback handler que fecha o dialog e empurra no undoStack:

```tsx
  const handlePriceApplied = useCallback(
    (args: { item: OrcamentoItem; previousData: PreviousPriceData }) => {
      undoStack.push({
        type: "update",
        table: "ob_orcamento_items",
        itemId: args.item.id,
        projectId,
        previousData: args.previousData as Record<string, unknown>,
      });
    },
    [projectId, undoStack]
  );
```

- [ ] **Step 4: Passar `onFindPriceSource` para cada `BudgetRow`**

Localizar o `<BudgetRow ...>` sendo renderizado dentro do `BudgetTable`. Adicionar a prop:

```tsx
onFindPriceSource={setPriceSourceItem}
```

- [ ] **Step 5: Renderizar o Dialog uma única vez ao final do JSX do `BudgetTable`**

Adicionar antes do fechamento do container principal do `BudgetTable`:

```tsx
<PriceSourceDialog
  item={priceSourceItem}
  open={!!priceSourceItem}
  onOpenChange={(open) => {
    if (!open) setPriceSourceItem(null);
  }}
  onApplied={handlePriceApplied}
/>
```

- [ ] **Step 6: Typecheck (incluir arquivos tocados)**

```bash
cd /Users/andrefogelman/orcabot/frontend
bun run typecheck 2>&1 | grep -E "(BudgetRow|BudgetTable|PriceSourceDialog)" || echo "CLEAN"
```

Expected: "CLEAN". Outros erros pré-existentes NÃO são nossa responsabilidade.

- [ ] **Step 7: Rodar testes (sanity — garantir que não quebrou os de eap/unit/price-source)**

```bash
cd /Users/andrefogelman/orcabot/frontend
bun test src/lib/
```

Expected: todos os testes passam (eap.test.ts + unit.test.ts + price-source.test.ts).

- [ ] **Step 8: Commit**

```bash
cd /Users/andrefogelman/orcabot
git add frontend/src/components/planilha/BudgetRow.tsx \
        frontend/src/components/planilha/BudgetTable.tsx
git commit -m "feat(planilha): wire PriceSourceDialog to BudgetRow/BudgetTable

Adds BookOpen button per row that opens a shared PriceSourceDialog
hosted by BudgetTable. On apply, pushes an 'update' undo entry
with the previous cost snapshot so Ctrl+Z reverts cleanly.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Build + Deploy + Smoke test

**Goal:** Build do frontend, push pro git (dispara deploy automático no projeto "orcabot" via git integration), smoke test manual.

- [ ] **Step 1: Build local**

```bash
cd /Users/andrefogelman/orcabot/frontend
bun run build
```

Expected: build completa sem erros, `dist/` gerado.

- [ ] **Step 2: Push**

```bash
cd /Users/andrefogelman/orcabot
git push
```

Expected: commits empurrados para `main`. A git integration do Vercel dispara automaticamente um novo deploy no projeto "orcabot", que serve `anfconstrucoes.com.br`. **NÃO rodar `vercel --prod --yes` do diretório frontend** — aquele `.vercel/project.json` aponta para um projeto diferente ("frontend") que não serve o domínio em produção.

- [ ] **Step 3: Aguardar deploy ficar Ready**

```bash
sleep 30 && npx vercel ls orcabot 2>&1 | head -5
```

Expected: topo da lista mostra um deploy com status `● Ready` dos últimos ~30 segundos.

- [ ] **Step 4: Smoke test manual**

Abrir `https://anfconstrucoes.com.br` no browser. Login. Abrir o projeto "Apartamento Mark Linker". Verificar:

- [ ] Cada linha tem um ícone 📖 (BookOpen) na coluna de ações
- [ ] Click no ícone abre o modal "Buscar preço de referência" com a descrição da linha pré-preenchida
- [ ] Tab SINAPI mostra resultados, linhas com unidade igual à da linha aparecem no topo com badge ✓
- [ ] Paginação SINAPI funciona (Anterior/Próxima)
- [ ] Trocar para tab TCPO mostra resultados TCPO
- [ ] Selecionar uma composição SINAPI → click "Aplicar" → modal fecha → linha da planilha mostra `custo_unitario` preenchido e `custo_total = custo_unitario × quantidade`. `custo_material` e `custo_mao_obra` ficam zerados.
- [ ] Ctrl+Z após aplicar → linha volta ao estado anterior (custos zerados)
- [ ] Selecionar uma composição TCPO → Aplicar → linha recebe `custo_unitario`, `custo_material` e `custo_mao_obra` divididos corretamente (checar via inspeção DB ou aritmética: material + mao_obra ≈ custo_unitario)
- [ ] Aplicar 2 vezes seguidas (SINAPI, depois TCPO) → 2 Ctrl+Z volta ao original
- [ ] ESC no modal cancela sem aplicar
- [ ] Limpar o campo de busca e digitar outra query → resultados atualizam

- [ ] **Step 5: Se houver falha, diagnosticar e corrigir**

Se algum item falhar:
1. Ler console do browser (F12)
2. Ler logs Vercel: `npx vercel logs orcabot 2>&1 | tail -30`
3. Fix → commit → push → re-test

---

## Self-Review do plano

**Spec coverage:**
- ✅ `lib/unit.ts` com normalize/match — Task 1
- ✅ `lib/price-source.ts` com computeTcpoSplit — Task 2
- ✅ `useApplyPriceSource` hook — Task 3
- ✅ `PriceSourceDialog` scaffold + tab structure + apply flow — Task 4
- ✅ Tab SINAPI com paginação + destaque de unidade — Task 5
- ✅ Tab TCPO com destaque de unidade — Task 6
- ✅ Botão em `BudgetRow` + dialog hospedado em `BudgetTable` + undoStack push — Task 7
- ✅ Build + deploy via git integration + smoke test — Task 8
- ✅ Undo usa tipo `"update"` existente (zero mudança em `useUndoStack`) — Task 7 step 3
- ✅ Sem migration, sem backend — confirmado em todas as tasks
- ✅ Tests unitários `unit.test.ts` e `price-source.test.ts` — Tasks 1 e 2

**Placeholder scan:** Nenhum "TBD", "similar to", "handle edge cases" etc. Todos os steps têm código ou comando concreto. Tasks 5 e 6 mostram o código completo das listas sem duplicar o código principal (sub-componentes bem delimitados).

**Type consistency:**
- `PriceSelection` definido em Task 3, importado em Task 4 e usado em Tasks 5, 6
- `PreviousPriceData` exportado em Task 3, importado em Task 7
- `SinapiComposicao` importado de `@/hooks/useSinapi` (Task 5)
- `TcpoComposicao` importado de `@/hooks/useTcpo` (Task 6)
- `OrcamentoItem` importado de `@/types/orcamento` (todas)
- `normalizeUnit`/`unitsMatch` de `@/lib/unit` (Tasks 5 e 6)
- `computeTcpoSplit` de `@/lib/price-source` (Task 3)
- `useApplyPriceSource` de `@/hooks/useApplyPriceSource` (Task 4)

**Ordem de dependência:**
1. `lib/unit.ts` (pure, sem deps) → 2. `lib/price-source.ts` (pure) → 3. `useApplyPriceSource` (depende de price-source) → 4. `PriceSourceDialog` scaffold (depende de useApplyPriceSource) → 5. Tab SINAPI (depende de scaffold + unit) → 6. Tab TCPO (depende de scaffold + unit) → 7. Integração (depende de dialog completo) → 8. Deploy.

Cada commit deixa a build em estado válido: Tasks 1-6 não quebram nada porque são código novo que ainda não é importado em lugar nenhum até Task 7.
