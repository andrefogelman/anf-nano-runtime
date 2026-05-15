import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateProject } from "@/hooks/useProjects";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

const TIPOS_OBRA = [
  "Residencial Unifamiliar",
  "Residencial Multifamiliar",
  "Comercial",
  "Industrial",
  "Reforma",
  "Infraestrutura",
  "Outro",
];

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createProject = useCreateProject();

  const [step, setStep] = useState<Step>(1);
  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [submittingOrg, setSubmittingOrg] = useState(false);
  const [hasOrg, setHasOrg] = useState<boolean | null>(null);

  // Project fields
  const [pname, setPname] = useState("");
  const [tipoObra, setTipoObra] = useState("Residencial Unifamiliar");
  const [areaM2, setAreaM2] = useState("");
  const [uf, setUf] = useState("SP");
  const [cidade, setCidade] = useState("");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // Probe se já tem org — se sim, manda direto pro dashboard
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("ob_org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1);
      if (cancelled) return;
      if (!error && data && data.length > 0) {
        setHasOrg(true);
        setOrgId(data[0].org_id);
        setStep(2);
      } else {
        setHasOrg(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const criarOrg = async () => {
    if (!orgName.trim()) {
      toast.error("Informe o nome da organização");
      return;
    }
    if (!user) {
      toast.error("Sessão expirada");
      return;
    }
    setSubmittingOrg(true);
    try {
      const { data: org, error: orgErr } = await supabase
        .from("ob_organizations")
        .insert({ name: orgName.trim() })
        .select()
        .single();
      if (orgErr) throw orgErr;
      const { error: memberErr } = await supabase
        .from("ob_org_members")
        .insert({
          org_id: org.id,
          user_id: user.id,
          role: "owner",
        });
      if (memberErr) throw memberErr;
      setOrgId(org.id);
      setStep(2);
      toast.success("Organização criada");
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setSubmittingOrg(false);
    }
  };

  const criarProjeto = async () => {
    if (!pname.trim()) {
      toast.error("Nome do projeto obrigatório");
      return;
    }
    if (!orgId) {
      toast.error("Org não encontrada");
      return;
    }
    try {
      const projInput = {
        name: pname.trim(),
        org_id: orgId,
        tipo_obra: tipoObra,
        area_total_m2: areaM2 ? Number(areaM2.replace(",", ".")) : null,
        uf,
        cidade: cidade.trim() || null,
        status: "draft" as const,
      } as Parameters<typeof createProject.mutateAsync>[0];
      const project = await createProject.mutateAsync(projInput);
      setCreatedProjectId(project.id);
      setStep(3);
      toast.success("Projeto criado");
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  };

  const concluir = () => {
    if (createdProjectId) {
      navigate(`/projetos/${createdProjectId}`);
    } else {
      navigate("/");
    }
  };

  if (hasOrg === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-primary" />
          Bem-vindo ao Orcamentista IA
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vamos configurar sua conta em 3 passos rápidos.
        </p>
      </header>

      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                step > s
                  ? "bg-primary text-primary-foreground"
                  : step === s
                    ? "border-2 border-primary text-primary"
                    : "border border-border text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 w-8 ${step > s ? "bg-primary" : "bg-border"}`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>1. Criar organização</CardTitle>
            <CardDescription>
              Escritório, empresa ou freelancer. Você poderá convidar
              colaboradores depois.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Nome da organização</Label>
              <Input
                id="org-name"
                placeholder="ex: ANF Construções"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && criarOrg()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={criarOrg} disabled={submittingOrg}>
                {submittingOrg ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Criar primeiro projeto</CardTitle>
            <CardDescription>
              Você poderá editar e criar mais projetos depois.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pname">Nome do projeto</Label>
              <Input
                id="pname"
                placeholder="ex: Reforma Apto Cida"
                value={pname}
                onChange={(e) => setPname(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de obra</Label>
                <Select value={tipoObra} onValueChange={setTipoObra}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_OBRA.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="area">Área total (m²)</Label>
                <Input
                  id="area"
                  type="text"
                  inputMode="decimal"
                  placeholder="ex: 236"
                  value={areaM2}
                  onChange={(e) => setAreaM2(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {UFS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  placeholder="ex: São Paulo"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-between gap-2">
              {!hasOrg && (
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
              )}
              <Button
                onClick={criarProjeto}
                disabled={createProject.isPending}
                className="ml-auto"
              >
                {createProject.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Tudo pronto!</CardTitle>
            <CardDescription>
              Você já pode subir PDFs de planta, fazer Q&A e exportar
              orçamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border border-border p-3">
              <strong>Próximos passos no projeto:</strong>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                <li>
                  Aba <strong>Arquivos</strong>: subir PDFs e DXFs
                </li>
                <li>
                  Aba <strong>Q&amp;A Plantas</strong>: perguntar à IA sobre as
                  plantas
                </li>
                <li>
                  Aba <strong>Extração</strong>: extração estruturada por
                  disciplina
                </li>
                <li>
                  Aba <strong>DXF</strong>: parse + viewer 3D
                </li>
                <li>
                  Header: <strong>XLSX + BDI</strong> e{" "}
                  <strong>Memorial PDF</strong>
                </li>
              </ul>
            </div>
            <Button onClick={concluir} className="w-full">
              <ArrowRight className="mr-2 h-4 w-4" />
              Abrir projeto
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
