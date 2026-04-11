import { describe, test, expect } from "bun:test";
import {
  formatEapCode,
  lastSegmentOf,
  padLengthForLevel,
  computeRenumberPatch,
  type InsertOperation,
  type DeleteOperation,
} from "./eap";
import type { OrcamentoItem } from "@/types/orcamento";

// Factory mínima — só as colunas que as funções tocam
function item(eap_code: string, eap_level: 1 | 2 | 3, id = eap_code): OrcamentoItem {
  return {
    id,
    project_id: "test-project",
    eap_code,
    eap_level,
    descricao: `item ${eap_code}`,
    unidade: null,
    quantidade: null,
    fonte: null,
    fonte_codigo: null,
    fonte_data_base: null,
    custo_unitario: null,
    custo_material: null,
    custo_mao_obra: null,
    custo_total: null,
    adm_percentual: 12,
    peso_percentual: null,
    curva_abc_classe: null,
    quantitativo_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as OrcamentoItem;
}

describe("padLengthForLevel", () => {
  test("level 1 and 2 use 2 digits", () => {
    expect(padLengthForLevel(1)).toBe(2);
    expect(padLengthForLevel(2)).toBe(2);
  });
  test("level 3 uses 3 digits", () => {
    expect(padLengthForLevel(3)).toBe(3);
  });
});

describe("formatEapCode", () => {
  test("level 1 has no prefix", () => {
    expect(formatEapCode("", 3, 1)).toBe("03");
    expect(formatEapCode("", 12, 1)).toBe("12");
  });
  test("level 2 uses parent prefix + 2 digits", () => {
    expect(formatEapCode("01", 2, 2)).toBe("01.02");
  });
  test("level 3 uses 3-digit padding", () => {
    expect(formatEapCode("01.02", 5, 3)).toBe("01.02.005");
  });
});

describe("lastSegmentOf", () => {
  test("level 1 code", () => {
    expect(lastSegmentOf("03")).toBe(3);
  });
  test("level 2 code", () => {
    expect(lastSegmentOf("01.07")).toBe(7);
  });
  test("level 3 code", () => {
    expect(lastSegmentOf("01.02.014")).toBe(14);
  });
});

describe("computeRenumberPatch - insert level 1", () => {
  test("insert at end returns empty patch", () => {
    const items = [item("01", 1), item("02", 1), item("03", 1)];
    const op: InsertOperation = { kind: "insert", level: 1, parentPrefix: "", atPosition: 4 };
    expect(computeRenumberPatch(items, op)).toEqual([]);
  });

  test("insert at start shifts all etapas +1", () => {
    const items = [item("01", 1), item("02", 1)];
    const op: InsertOperation = { kind: "insert", level: 1, parentPrefix: "", atPosition: 1 };
    const patch = computeRenumberPatch(items, op);
    expect(patch).toEqual([
      { id: "01", eap_code: "02" },
      { id: "02", eap_code: "03" },
    ]);
  });

  test("insert in middle shifts only siblings >= atPosition", () => {
    const items = [item("01", 1), item("02", 1), item("03", 1), item("04", 1)];
    const op: InsertOperation = { kind: "insert", level: 1, parentPrefix: "", atPosition: 3 };
    const patch = computeRenumberPatch(items, op);
    expect(patch).toEqual([
      { id: "03", eap_code: "04" },
      { id: "04", eap_code: "05" },
    ]);
  });

  test("insert cascades rename to descendants", () => {
    const items = [
      item("01", 1),
      item("02", 1),
      item("02.01", 2),
      item("02.02", 2),
      item("02.01.001", 3),
      item("03", 1),
      item("03.01", 2),
    ];
    const op: InsertOperation = { kind: "insert", level: 1, parentPrefix: "", atPosition: 2 };
    const patch = computeRenumberPatch(items, op);
    expect(patch).toContainEqual({ id: "02", eap_code: "03" });
    expect(patch).toContainEqual({ id: "02.01", eap_code: "03.01" });
    expect(patch).toContainEqual({ id: "02.02", eap_code: "03.02" });
    expect(patch).toContainEqual({ id: "02.01.001", eap_code: "03.01.001" });
    expect(patch).toContainEqual({ id: "03", eap_code: "04" });
    expect(patch).toContainEqual({ id: "03.01", eap_code: "04.01" });
    expect(patch).toHaveLength(6);
  });

  test("empty list returns empty patch", () => {
    const op: InsertOperation = { kind: "insert", level: 1, parentPrefix: "", atPosition: 1 };
    expect(computeRenumberPatch([], op)).toEqual([]);
  });
});

describe("computeRenumberPatch - insert level 2", () => {
  test("insert in middle of etapa respects parentPrefix", () => {
    const items = [
      item("01", 1),
      item("01.01", 2),
      item("01.02", 2),
      item("01.03", 2),
      item("02", 1),
      item("02.01", 2),
    ];
    const op: InsertOperation = { kind: "insert", level: 2, parentPrefix: "01", atPosition: 2 };
    const patch = computeRenumberPatch(items, op);
    expect(patch).toContainEqual({ id: "01.02", eap_code: "01.03" });
    expect(patch).toContainEqual({ id: "01.03", eap_code: "01.04" });
    expect(patch.find((p) => p.id === "02")).toBeUndefined();
    expect(patch.find((p) => p.id === "02.01")).toBeUndefined();
    expect(patch).toHaveLength(2);
  });

  test("insert cascades to level 3 descendants", () => {
    const items = [
      item("01", 1),
      item("01.01", 2),
      item("01.01.001", 3),
      item("01.02", 2),
      item("01.02.001", 3),
      item("01.02.002", 3),
    ];
    const op: InsertOperation = { kind: "insert", level: 2, parentPrefix: "01", atPosition: 1 };
    const patch = computeRenumberPatch(items, op);
    expect(patch).toContainEqual({ id: "01.01", eap_code: "01.02" });
    expect(patch).toContainEqual({ id: "01.01.001", eap_code: "01.02.001" });
    expect(patch).toContainEqual({ id: "01.02", eap_code: "01.03" });
    expect(patch).toContainEqual({ id: "01.02.001", eap_code: "01.03.001" });
    expect(patch).toContainEqual({ id: "01.02.002", eap_code: "01.03.002" });
    expect(patch).toHaveLength(5);
  });
});

describe("computeRenumberPatch - insert level 3", () => {
  test("uses 3-digit padding", () => {
    const items = [
      item("01", 1),
      item("01.01", 2),
      item("01.01.001", 3),
      item("01.01.002", 3),
    ];
    const op: InsertOperation = { kind: "insert", level: 3, parentPrefix: "01.01", atPosition: 1 };
    const patch = computeRenumberPatch(items, op);
    expect(patch).toEqual([
      { id: "01.01.001", eap_code: "01.01.002" },
      { id: "01.01.002", eap_code: "01.01.003" },
    ]);
  });
});

describe("computeRenumberPatch - delete level 1", () => {
  test("delete last etapa returns empty patch", () => {
    const items = [item("01", 1), item("02", 1), item("03", 1)];
    const op: DeleteOperation = { kind: "delete", deletedCode: "03", level: 1 };
    expect(computeRenumberPatch(items, op)).toEqual([]);
  });

  test("delete first etapa shifts all others -1", () => {
    const items = [item("01", 1), item("02", 1), item("03", 1)];
    const op: DeleteOperation = { kind: "delete", deletedCode: "01", level: 1 };
    expect(computeRenumberPatch(items, op)).toEqual([
      { id: "02", eap_code: "01" },
      { id: "03", eap_code: "02" },
    ]);
  });

  test("delete in middle shifts only subsequent", () => {
    const items = [item("01", 1), item("02", 1), item("03", 1), item("04", 1)];
    const op: DeleteOperation = { kind: "delete", deletedCode: "02", level: 1 };
    const patch = computeRenumberPatch(items, op);
    expect(patch).toEqual([
      { id: "03", eap_code: "02" },
      { id: "04", eap_code: "03" },
    ]);
  });

  test("delete cascades rename to descendants of subsequent siblings", () => {
    const items = [
      item("01", 1),
      item("02", 1),
      item("02.01", 2),
      item("03", 1),
      item("03.01", 2),
      item("03.01.001", 3),
      item("03.02", 2),
    ];
    const op: DeleteOperation = { kind: "delete", deletedCode: "02", level: 1 };
    const patch = computeRenumberPatch(items, op);
    // Items being deleted (02 and its children) must NOT be in the patch
    expect(patch.find((p) => p.id === "02")).toBeUndefined();
    expect(patch.find((p) => p.id === "02.01")).toBeUndefined();
    // 03 → 02 and entire subtree follows
    expect(patch).toContainEqual({ id: "03", eap_code: "02" });
    expect(patch).toContainEqual({ id: "03.01", eap_code: "02.01" });
    expect(patch).toContainEqual({ id: "03.01.001", eap_code: "02.01.001" });
    expect(patch).toContainEqual({ id: "03.02", eap_code: "02.02" });
    expect(patch).toHaveLength(4);
  });
});

describe("computeRenumberPatch - delete level 2", () => {
  test("delete middle item in etapa shifts subsequent siblings", () => {
    const items = [
      item("01", 1),
      item("01.01", 2),
      item("01.02", 2),
      item("01.03", 2),
      item("02", 1),
      item("02.01", 2),
    ];
    const op: DeleteOperation = { kind: "delete", deletedCode: "01.02", level: 2 };
    const patch = computeRenumberPatch(items, op);
    expect(patch).toEqual([{ id: "01.03", eap_code: "01.02" }]);
    // 02 and 02.01 should not be touched (different parent)
    expect(patch.find((p) => p.id === "02")).toBeUndefined();
  });

  test("delete level 2 cascades to level 3 descendants", () => {
    const items = [
      item("01", 1),
      item("01.01", 2),
      item("01.02", 2),
      item("01.02.001", 3),
      item("01.02.002", 3),
      item("01.03", 2),
      item("01.03.001", 3),
    ];
    const op: DeleteOperation = { kind: "delete", deletedCode: "01.01", level: 2 };
    const patch = computeRenumberPatch(items, op);
    expect(patch).toContainEqual({ id: "01.02", eap_code: "01.01" });
    expect(patch).toContainEqual({ id: "01.02.001", eap_code: "01.01.001" });
    expect(patch).toContainEqual({ id: "01.02.002", eap_code: "01.01.002" });
    expect(patch).toContainEqual({ id: "01.03", eap_code: "01.02" });
    expect(patch).toContainEqual({ id: "01.03.001", eap_code: "01.02.001" });
    expect(patch).toHaveLength(5);
  });
});

describe("computeRenumberPatch - delete level 3", () => {
  test("uses 3-digit padding when renumbering", () => {
    const items = [
      item("01", 1),
      item("01.01", 2),
      item("01.01.001", 3),
      item("01.01.002", 3),
      item("01.01.003", 3),
    ];
    const op: DeleteOperation = { kind: "delete", deletedCode: "01.01.001", level: 3 };
    const patch = computeRenumberPatch(items, op);
    expect(patch).toEqual([
      { id: "01.01.002", eap_code: "01.01.001" },
      { id: "01.01.003", eap_code: "01.01.002" },
    ]);
  });
});
