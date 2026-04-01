import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCreateProject } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const TIPOS_OBRA = [
  "Residencial Unifamiliar",
  "Residencial Multifamiliar",
  "Comercial",
  "Industrial",
  "Reforma",
  "Infraestrutura",
  "Outro",
];

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tipoObra, setTipoObra] = useState("");
  const [areaM2, setAreaM2] = useState("");
  const [uf, setUf] = useState("SP");
  const [cidade, setCidade] = useState("");
  const [admPadrao, setAdmPadrao] = useState("12");
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ob_org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setOrgId(data.org_id);
      });
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;

    const result = await createProject.mutateAsync({
      org_id: orgId,
      name,
      description: null,
      tipo_obra: tipoObra,
      area_total_m2: areaM2 ? parseFloat(areaM2) : null,
      uf,
      cidade: cidade || null,
      data_base_sinapi: null,
      bdi_percentual: null,
      status: "draft",
      premissas: {
        adm_percentual_padrao: parseFloat(admPadrao),
      },
    });

    setOpen(false);
    navigate(`/projetos/${result.id}`);
  }

  function resetForm() {
    setName("");
    setTipoObra("");
    setAreaM2("");
    setUf("SP");
    setCidade("");
    setAdmPadrao("12");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Projeto</DialogTitle>
          <DialogDescription>
            Preencha as premissas iniciais do projeto
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proj-name">Nome do Projeto *</Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Residência Família Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Obra *</Label>
            <Select value={tipoObra} onValueChange={setTipoObra} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_OBRA.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>UF *</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Ex: São Paulo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="area">Área Total (m²)</Label>
              <Input
                id="area"
                type="number"
                step="0.01"
                value={areaM2}
                onChange={(e) => setAreaM2(e.target.value)}
                placeholder="Ex: 250"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm">Adm% Padrão</Label>
              <Input
                id="adm"
                type="number"
                step="0.5"
                value={admPadrao}
                onChange={(e) => setAdmPadrao(e.target.value)}
                placeholder="12"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "Criando..." : "Criar Projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
