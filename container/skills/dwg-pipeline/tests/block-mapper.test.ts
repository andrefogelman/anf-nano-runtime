import { describe, it, expect } from "vitest";
import { identifyByName } from "../src/block-mapper.js";

describe("identifyByName", () => {
  it("identifies tomada blocks", () => {
    expect(identifyByName("TOMADA_2P")).toEqual({ componente: "tomada", disciplina: "ele", unidade: "pt" });
    expect(identifyByName("TUG_127V")).toEqual({ componente: "tomada", disciplina: "ele", unidade: "pt" });
    expect(identifyByName("TUE_220V")).toEqual({ componente: "tomada", disciplina: "ele", unidade: "pt" });
  });

  it("identifies ponto_iluminacao blocks", () => {
    expect(identifyByName("PONTO_LUZ")).toEqual({ componente: "ponto_iluminacao", disciplina: "ele", unidade: "pt" });
    expect(identifyByName("ILUMINACAO_LED")).toEqual({ componente: "ponto_iluminacao", disciplina: "ele", unidade: "pt" });
    expect(identifyByName("LUMINARIA")).toEqual({ componente: "ponto_iluminacao", disciplina: "ele", unidade: "pt" });
  });

  it("identifies interruptor blocks", () => {
    expect(identifyByName("INTERRUPTOR_SIMPLES")).toEqual({ componente: "interruptor", disciplina: "ele", unidade: "un" });
    expect(identifyByName("SWITCH_3WAY")).toEqual({ componente: "interruptor", disciplina: "ele", unidade: "un" });
  });

  it("identifies registro blocks", () => {
    expect(identifyByName("REGISTRO_GAVETA")).toEqual({ componente: "registro", disciplina: "hid", unidade: "un" });
    expect(identifyByName("REG_50MM")).toEqual({ componente: "registro", disciplina: "hid", unidade: "un" });
  });

  it("identifies ralo blocks", () => {
    expect(identifyByName("RALO_SECO")).toEqual({ componente: "ralo", disciplina: "hid", unidade: "un" });
  });

  it("identifies porta blocks", () => {
    expect(identifyByName("PORTA_80")).toEqual({ componente: "porta", disciplina: "arq", unidade: "un" });
    expect(identifyByName("DOOR_01")).toEqual({ componente: "porta", disciplina: "arq", unidade: "un" });
    expect(identifyByName("P1")).toEqual({ componente: "porta", disciplina: "arq", unidade: "un" });
    expect(identifyByName("P12")).toEqual({ componente: "porta", disciplina: "arq", unidade: "un" });
  });

  it("identifies janela blocks", () => {
    expect(identifyByName("JANELA_120x100")).toEqual({ componente: "janela", disciplina: "arq", unidade: "un" });
    expect(identifyByName("WINDOW_01")).toEqual({ componente: "janela", disciplina: "arq", unidade: "un" });
    expect(identifyByName("J1")).toEqual({ componente: "janela", disciplina: "arq", unidade: "un" });
  });

  it("identifies pilar blocks", () => {
    expect(identifyByName("PILAR_P1")).toEqual({ componente: "pilar", disciplina: "est", unidade: "un" });
    expect(identifyByName("COL_20x30")).toEqual({ componente: "pilar", disciplina: "est", unidade: "un" });
  });

  it("returns null for generic/unknown blocks", () => {
    expect(identifyByName("Block1")).toBeNull();
    expect(identifyByName("XPTO")).toBeNull();
    expect(identifyByName("Copy of Block")).toBeNull();
    expect(identifyByName("AnonBlock_1")).toBeNull();
  });
});
