import type { OrcamentoItem } from "@/types/orcamento";

export type EapLevel = 1 | 2 | 3;

export type InsertOperation = {
  kind: "insert";
  level: EapLevel;
  /** Prefixo do pai — '' para level 1, '01' para level 2, '01.02' para level 3 */
  parentPrefix: string;
  /** 1-based: se já existe item com esse last-segment, ele é empurrado */
  atPosition: number;
};

export type DeleteOperation = {
  kind: "delete";
  /** eap_code completo do item deletado */
  deletedCode: string;
  level: EapLevel;
};

export type EapPatch = { id: string; eap_code: string };

/** Padding do último segmento por nível (level 3 é 3 dígitos, demais 2). */
export function padLengthForLevel(level: EapLevel): number {
  return level === 3 ? 3 : 2;
}

/** Formata um eap_code a partir de prefixo pai + número + nível. */
export function formatEapCode(parentPrefix: string, lastSegment: number, level: EapLevel): string {
  const pad = padLengthForLevel(level);
  const padded = String(lastSegment).padStart(pad, "0");
  return parentPrefix ? `${parentPrefix}.${padded}` : padded;
}

/**
 * Extrai o último segmento numérico de um eap_code.
 * Ex: "03" → 3, "01.02" → 2, "01.02.003" → 3
 */
export function lastSegmentOf(eapCode: string): number {
  const parts = eapCode.split(".");
  return parseInt(parts[parts.length - 1], 10);
}

export function computeRenumberPatch(
  items: OrcamentoItem[],
  operation: InsertOperation | DeleteOperation
): EapPatch[] {
  if (operation.kind === "insert") {
    return computeInsertPatch(items, operation);
  }
  return computeDeletePatch(items, operation);
}

function computeInsertPatch(items: OrcamentoItem[], op: InsertOperation): EapPatch[] {
  // Identificar irmãos do mesmo nível sob o mesmo pai
  const siblings = items.filter((i) => {
    if (i.eap_level !== op.level) return false;
    if (op.level === 1) return true;
    return i.eap_code.startsWith(op.parentPrefix + ".");
  });

  // Irmãos a renumerar: aqueles com last-segment >= atPosition
  const toShift = siblings.filter((s) => lastSegmentOf(s.eap_code) >= op.atPosition);
  if (toShift.length === 0) return [];

  const patch: EapPatch[] = [];

  for (const sibling of toShift) {
    const oldLast = lastSegmentOf(sibling.eap_code);
    const newLast = oldLast + 1;
    const newCode = formatEapCode(op.parentPrefix, newLast, op.level);
    patch.push({ id: sibling.id, eap_code: newCode });

    // Cascatear para todos os descendentes desse irmão
    const oldPrefix = sibling.eap_code;
    const newPrefix = newCode;
    for (const desc of items) {
      if (desc.eap_code.startsWith(oldPrefix + ".")) {
        const suffix = desc.eap_code.slice(oldPrefix.length);
        patch.push({ id: desc.id, eap_code: newPrefix + suffix });
      }
    }
  }

  return patch;
}

function computeDeletePatch(items: OrcamentoItem[], op: DeleteOperation): EapPatch[] {
  // Derive parentPrefix from deletedCode
  const parts = op.deletedCode.split(".");
  const parentPrefix = parts.slice(0, -1).join(".");
  const deletedLastSegment = parseInt(parts[parts.length - 1], 10);

  // Same-level siblings under same parent (excluding the deleted item itself)
  const siblings = items.filter((i) => {
    if (i.eap_level !== op.level) return false;
    if (i.eap_code === op.deletedCode) return false;
    if (op.level === 1) return true;
    return i.eap_code.startsWith(parentPrefix + ".");
  });

  // Siblings with last-segment > deletedLastSegment need shift -1
  const toShift = siblings.filter((s) => lastSegmentOf(s.eap_code) > deletedLastSegment);
  if (toShift.length === 0) return [];

  const patch: EapPatch[] = [];

  for (const sibling of toShift) {
    const oldLast = lastSegmentOf(sibling.eap_code);
    const newLast = oldLast - 1;
    const newCode = formatEapCode(parentPrefix, newLast, op.level);
    patch.push({ id: sibling.id, eap_code: newCode });

    // Cascade to descendants
    const oldPrefix = sibling.eap_code;
    const newPrefix = newCode;
    for (const desc of items) {
      if (desc.eap_code.startsWith(oldPrefix + ".")) {
        const suffix = desc.eap_code.slice(oldPrefix.length);
        patch.push({ id: desc.id, eap_code: newPrefix + suffix });
      }
    }
  }

  return patch;
}
