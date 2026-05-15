import { useState } from "react";
import { Loader2, Upload, Boxes, Ruler, Hash, Type as TypeIcon } from "lucide-react";
import { toast } from "sonner";

import {
  useDxfAction,
  type DxfParseResult,
  type DxfAreasResult,
  type DxfCountResult,
  type DxfTextResult,
} from "@/hooks/useExtract";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DxfViewer } from "@/components/pdf/DxfViewer";

type ResultKind =
  | { kind: "parse"; data: DxfParseResult }
  | { kind: "areas"; data: DxfAreasResult }
  | { kind: "count"; data: DxfCountResult }
  | { kind: "text"; data: DxfTextResult };

export function DxfToolsPanel() {
  const [dxfBlob, setDxfBlob] = useState<Blob | null>(null);
  const [dxfFilename, setDxfFilename] = useState<string>("");
  const [layerFilter, setLayerFilter] = useState<string>("");
  const [blockName, setBlockName] = useState<string>("");
  const [result, setResult] = useState<ResultKind | null>(null);

  const parseM = useDxfAction<DxfParseResult>();
  const areasM = useDxfAction<DxfAreasResult>();
  const countM = useDxfAction<DxfCountResult>();
  const textM = useDxfAction<DxfTextResult>();

  const isPending =
    parseM.isPending || areasM.isPending || countM.isPending || textM.isPending;

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".dxf")) {
      toast.error("Arquivo precisa ser .dxf");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("DXF maior que 50MB");
      return;
    }
    setDxfBlob(file);
    setDxfFilename(file.name);
    setResult(null);
  };

  const requireBlob = (): Blob | null => {
    if (!dxfBlob) {
      toast.error("Faça upload de um DXF primeiro");
      return null;
    }
    return dxfBlob;
  };

  const runParse = async () => {
    const b = requireBlob();
    if (!b) return;
    try {
      const data = await parseM.mutateAsync({
        action: "parse",
        dxf: b,
        filename: dxfFilename,
      });
      setResult({ kind: "parse", data });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const runAreas = async () => {
    const b = requireBlob();
    if (!b) return;
    try {
      const data = await areasM.mutateAsync({
        action: "areas",
        dxf: b,
        filename: dxfFilename,
        layer_filter: layerFilter || null,
      });
      setResult({ kind: "areas", data });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const runCount = async () => {
    const b = requireBlob();
    if (!b) return;
    if (!blockName.trim()) {
      toast.error("Informe o nome do block");
      return;
    }
    try {
      const data = await countM.mutateAsync({
        action: "count",
        dxf: b,
        filename: dxfFilename,
        block_name: blockName.trim(),
        layer_filter: layerFilter || null,
      });
      setResult({ kind: "count", data });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const runText = async () => {
    const b = requireBlob();
    if (!b) return;
    try {
      const data = await textM.mutateAsync({
        action: "text",
        dxf: b,
        filename: dxfFilename,
        layer_filter: layerFilter || null,
      });
      setResult({ kind: "text", data });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="grid h-full grid-cols-[400px_minmax(0,1fr)] gap-4 p-4">
      {/* Coluna esquerda: controles */}
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload DXF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label
              htmlFor="dxf-file"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border p-3 text-sm hover:bg-muted/30"
            >
              <Upload className="h-4 w-4" />
              {dxfFilename || "Selecione um arquivo .dxf (≤50MB)"}
              <input
                id="dxf-file"
                type="file"
                accept=".dxf"
                onChange={onUpload}
                className="hidden"
              />
            </Label>
            {dxfBlob && (
              <div className="text-xs text-muted-foreground">
                {(dxfBlob.size / 1024 / 1024).toFixed(2)} MB
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="layer-filter">Filtro de layer (opcional)</Label>
              <Input
                id="layer-filter"
                placeholder="ex: PISO, PAREDES, ELE_TOMADAS"
                value={layerFilter}
                onChange={(e) => setLayerFilter(e.target.value)}
              />
            </div>

            <Button
              onClick={runParse}
              disabled={isPending || !dxfBlob}
              className="w-full justify-start"
              variant="outline"
            >
              {parseM.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Boxes className="mr-2 h-4 w-4" />
              )}
              Parse — layers + entidades
            </Button>

            <Button
              onClick={runAreas}
              disabled={isPending || !dxfBlob}
              className="w-full justify-start"
              variant="outline"
            >
              {areasM.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ruler className="mr-2 h-4 w-4" />
              )}
              Áreas (Shoelace)
            </Button>

            <div className="space-y-1.5">
              <Label htmlFor="block-name">Nome do block</Label>
              <div className="flex gap-2">
                <Input
                  id="block-name"
                  placeholder="ex: PORTA, JANELA"
                  value={blockName}
                  onChange={(e) => setBlockName(e.target.value)}
                />
                <Button
                  onClick={runCount}
                  disabled={isPending || !dxfBlob || !blockName.trim()}
                  variant="outline"
                >
                  {countM.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Hash className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              onClick={runText}
              disabled={isPending || !dxfBlob}
              className="w-full justify-start"
              variant="outline"
            >
              {textM.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TypeIcon className="mr-2 h-4 w-4" />
              )}
              Extrair textos
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Coluna direita: viewer + resultado em tabs */}
      <Card className="flex min-h-0 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col p-3">
          <Tabs defaultValue="viewer" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mb-2 self-start">
              <TabsTrigger value="viewer">Viewer 3D</TabsTrigger>
              <TabsTrigger value="result" disabled={!result}>
                Resultado
              </TabsTrigger>
            </TabsList>
            <TabsContent value="viewer" className="flex-1">
              {dxfBlob ? (
                <DxfViewer blob={dxfBlob} className="h-full w-full rounded-md border bg-white" />
              ) : (
                <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  Faça upload de um DXF para visualizar
                </div>
              )}
            </TabsContent>
            <TabsContent value="result" className="flex min-h-0 flex-1 flex-col">
              {result && <ResultRender result={result} />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultRender({ result }: { result: ResultKind }) {
  if (result.kind === "parse") {
    const d = result.data;
    return (
      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{d.n_layers} layers</Badge>
            <Badge variant="secondary">{d.n_entities_total} entidades</Badge>
            <Badge variant="secondary">
              {Object.keys(d.block_inserts).length} blocks distintos
            </Badge>
          </div>
          <PrettyJson data={d} />
        </div>
      </ScrollArea>
    );
  }
  if (result.kind === "areas") {
    const d = result.data;
    return (
      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-3">
          <div className="text-sm text-muted-foreground">
            {d.layer_filter ? `Filtro: layer = ${d.layer_filter}` : "Todas as layers"}
            {" · "}
            {d.results.length} layer(s) com polylines fechadas
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1">Layer</th>
                <th className="py-1 text-right">N polylines</th>
                <th className="py-1 text-right">Total</th>
                <th className="py-1 text-right">Maior</th>
                <th className="py-1 text-right">Menor</th>
              </tr>
            </thead>
            <tbody>
              {d.results.map((r) => (
                <tr key={r.layer} className="border-t">
                  <td className="py-1 font-mono">{r.layer}</td>
                  <td className="py-1 text-right">{r.n_polylines}</td>
                  <td className="py-1 text-right tabular-nums">
                    {r.area_total.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {r.area_largest.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {r.area_smallest.toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    );
  }
  if (result.kind === "count") {
    const d = result.data;
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6">
        <div className="text-5xl font-bold tabular-nums">{d.count}</div>
        <div className="text-sm text-muted-foreground">
          inserções de <span className="font-mono">{d.block_name}</span>
          {d.layer_filter && (
            <> em <span className="font-mono">{d.layer_filter}</span></>
          )}
        </div>
      </div>
    );
  }
  // text
  const d = result.data;
  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2 pr-3">
        <div className="text-sm text-muted-foreground">
          {d.n_items} texto(s)
          {d.layer_filter && <> em <span className="font-mono">{d.layer_filter}</span></>}
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-1">Texto</th>
              <th className="py-1">Layer</th>
              <th className="py-1 text-right">X</th>
              <th className="py-1 text-right">Y</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((it, i) => (
              <tr key={i} className="border-t">
                <td className="max-w-md truncate py-1" title={it.text}>{it.text}</td>
                <td className="py-1 font-mono text-xs">{it.layer}</td>
                <td className="py-1 text-right tabular-nums">{it.x.toFixed(2)}</td>
                <td className="py-1 text-right tabular-nums">{it.y.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScrollArea>
  );
}

function PrettyJson({ data }: { data: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/30 p-3 text-xs leading-relaxed">
      <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
  );
}
