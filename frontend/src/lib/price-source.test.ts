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
    const insumos: TcpoInsumoLite[] = [
      { classe: "MOD", total: 40 },
      { classe: "MAT", total: 60 },
    ];
    const r = computeTcpoSplit(125, insumos);
    expect(r.custo_unitario).toBe(125);
    expect(r.custo_mao_obra).toBeCloseTo(50, 5);
    expect(r.custo_material).toBeCloseTo(75, 5);
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
