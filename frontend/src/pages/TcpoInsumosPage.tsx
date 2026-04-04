import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface TcpoInsumoBase {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  categoria: string;
  regiao: string;
  preco: number;
}

function useTcpoInsumosSearch(query: string, categoria: string | null) {
  return useQuery<TcpoInsumoBase[]>({
    queryKey: ["tcpo-insumos-base", query, categoria],
    queryFn: async () => {
      let q = supabase.from("ob_tcpo_insumos_base").select("*").order("codigo", { ascending: true });
      if (categoria) q = q.eq("categoria", categoria);
      if (query.trim()) q = q.or(`descricao.ilike.%${query.trim()}%,codigo.ilike.%${query.trim()}%`);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: (prev) => prev,
  });
}

export default function TcpoInsumosPage() {
  const location = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const categoria = useMemo(() => new URLSearchParams(location.search).get("cat"), [location.search]);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedQuery(searchInput), 300);
    return () => clearTimeout(timerRef.current);
  }, [searchInput]);

  const { data: insumos, isLoading } = useTcpoInsumosSearch(debouncedQuery, categoria);

  const headerText = categoria || "Todos os insumos";

  return (
    <div className="flex flex-col h-full max-w-fit">
      {/* Orange header */}
      <div className="bg-orange-500 text-white px-6 py-2 flex items-center justify-between">
        <span className="text-sm font-medium">
          Mostrando: {headerText}
          {insumos && (
            <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
              {insumos.length} itens
            </Badge>
          )}
        </span>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar insumo por descrição ou código..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : insumos && insumos.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Base</TableHead>
                <TableHead className="w-36">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-16 text-center">Unidade</TableHead>
                <TableHead className="w-32 text-right">Preço (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insumos.map((ins) => (
                <TableRow key={ins.id}>
                  <TableCell className="text-xs text-muted-foreground">TCPO_PINI</TableCell>
                  <TableCell className="font-mono text-xs text-blue-700 font-medium">{ins.codigo}</TableCell>
                  <TableCell className="text-sm">{ins.descricao}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{ins.unidade}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                    {ins.preco > 0 ? `R$ ${ins.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">Nenhum insumo encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
