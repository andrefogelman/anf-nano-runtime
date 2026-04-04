#!/usr/bin/env npx tsx
/**
 * TCPO Insumos Scraper v4 — Amostra: 100 materiais + mão de obra completa + equipamentos completos
 * Usa a mesma abordagem do scraper de composições que funcionou.
 * Fase 1: Coleta códigos da árvore (salva progressivamente)
 * Fase 2: Busca cada código para pegar preço SP
 */

import { chromium, type Page } from "playwright";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HOME_URL = "https://tcpoweb.pini.com.br/home/home.aspx";
const TREE_URL = "https://tcpoweb.pini.com.br/PesqServicosTreeView.aspx";
const EMAIL = "andre@anf.com.br";
const PASSWORD = "andre@anf";

const OUTPUT_DIR = join(import.meta.dirname || ".", "tcpo-output");
const CODES_FILE = join(OUTPUT_DIR, "tcpo-insumos-v4-codes.json");
const OUTPUT_FILE = join(OUTPUT_DIR, "tcpo-insumos-v4-complete.json");
const CHECKPOINT_FILE = join(OUTPUT_DIR, "tcpo-insumos-v4-checkpoint.json");

// Materiais: só 1 página (100 itens como amostra)
// Mão de obra: tudo (46 itens)
// Equipamentos: tudo
const CATEGORIES_CONFIG: Array<{ name: string; maxPages: number }> = [
  { name: "Mão de obra", maxPages: 999 },
  { name: "Mão de obra empreitada", maxPages: 999 },
  { name: "Serviços terceirizados", maxPages: 999 },
  { name: "Equipamentos - Aquisição", maxPages: 999 },
  { name: "Equipamentos - Locação", maxPages: 999 },
  { name: "Materiais", maxPages: 1 }, // só 1 página = ~100 itens amostra
];

interface InsumoCode { code: string; desc: string; unit: string; categoria: string; }
interface InsumoComplete {
  codigo: string; descricao: string; unidade: string; tipo: string;
  categoria: string; regiao: string; data_preco: string; preco: number;
}

let allCodes: InsumoCode[] = [];
let allInsumos: InsumoComplete[] = [];
let completedCodes: string[] = [];
let completedCategories: string[] = [];

function loadState(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  if (existsSync(CODES_FILE)) allCodes = JSON.parse(readFileSync(CODES_FILE, "utf-8"));
  if (existsSync(OUTPUT_FILE)) allInsumos = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
  if (existsSync(CHECKPOINT_FILE)) {
    const cp = JSON.parse(readFileSync(CHECKPOINT_FILE, "utf-8"));
    completedCodes = cp.codes || [];
    completedCategories = cp.categories || [];
  }
  console.log(`Loaded: ${allCodes.length} codes, ${allInsumos.length} insumos, ${completedCodes.length} price-checked`);
}

function saveState(): void {
  writeFileSync(CODES_FILE, JSON.stringify(allCodes, null, 2), "utf-8");
  writeFileSync(OUTPUT_FILE, JSON.stringify(allInsumos, null, 2), "utf-8");
  writeFileSync(CHECKPOINT_FILE, JSON.stringify({ codes: completedCodes, categories: completedCategories }), "utf-8");
}

async function login(page: Page): Promise<void> {
  console.log("Logging in...");
  page.on("dialog", async (d) => { await d.dismiss().catch(() => {}); });
  await page.goto(HOME_URL, { waitUntil: "networkidle", timeout: 20000 });
  await page.fill('input[placeholder="Usuário"]', EMAIL);
  await page.fill('input[placeholder="Senha"]', PASSWORD);
  await page.click('input[value="Entrar"]');
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3000);

  for (let attempt = 1; attempt <= 10; attempt++) {
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300));
    if (page.url().includes("Menu.aspx") || bodyText.includes("Sair")) { console.log("✅ Login OK"); return; }
    if (bodyText.includes("Acesso negado")) {
      const wait = attempt * 30;
      console.log(`Session conflict (${attempt}/10) — waiting ${wait}s...`);
      await page.click("text=OK").catch(() => {});
      await page.waitForTimeout(wait * 1000);
      await page.goto(HOME_URL, { waitUntil: "networkidle", timeout: 20000 });
      await page.fill('input[placeholder="Usuário"]', EMAIL);
      await page.fill('input[placeholder="Senha"]', PASSWORD);
      await page.click('input[value="Entrar"]');
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(3000);
      continue;
    }
    throw new Error(`Login failed: ${page.url()}`);
  }
}

async function goToTree(page: Page): Promise<void> {
  if (!page.url().includes("PesqServicos")) {
    await page.goto(TREE_URL, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1000);
  }
  const base = await page.$('select[id*="ddlBases"]');
  if (base) {
    const val = await base.inputValue();
    if (!val.includes("PRECOSPINI")) {
      await base.selectOption("PRECOSPINI|1|");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
    }
  }
}

// ── PHASE 1 ─────────────────────────────────────────────────────

async function collectCategory(page: Page, catName: string, maxPages: number): Promise<InsumoCode[]> {
  if (completedCategories.includes(catName)) {
    const existing = allCodes.filter(c => c.categoria === catName);
    console.log(`  ⏭️ ${catName}: already collected (${existing.length} codes)`);
    return existing;
  }

  console.log(`\n📂 ${catName} (max ${maxPages} pages)`);
  await goToTree(page);

  // Expand Insumos
  await page.evaluate(() => {
    for (const l of document.querySelectorAll('a')) { if (l.innerText?.trim() === 'Insumos') { l.click(); return; } }
  });
  await page.waitForTimeout(1500);

  // Click category
  const clicked = await page.evaluate((name: string) => {
    for (const l of document.querySelectorAll('a')) { if (l.innerText?.trim() === name) { l.click(); return true; } }
    return false;
  }, catName);
  if (!clicked) { console.log(`  ❌ Not found: ${catName}`); return []; }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);

  const items: InsumoCode[] = [];
  let pageNum = 1;

  while (pageNum <= maxPages) {
    const pageItems: InsumoCode[] = await page.evaluate(`(() => {
      var items = [];
      var rows = document.querySelectorAll('tr');
      for (var i = 0; i < rows.length; i++) {
        var cells = rows[i].querySelectorAll('td');
        if (cells.length >= 3) {
          var base = (cells[0].innerText || '').trim();
          var code = (cells[1].innerText || '').trim();
          var desc = (cells[2].innerText || '').trim();
          var unit = cells.length > 3 ? (cells[cells.length-1].innerText || '').trim() : '';
          if (base.indexOf('PINI') >= 0 && code.match(/[0-9]/) && desc.length > 1) {
            items.push({ code: code, desc: desc, unit: unit, categoria: '${catName.replace(/'/g, "\\'")}' });
          }
        }
      }
      return items;
    })()`);

    items.push(...pageItems);
    if (pageNum % 5 === 0 || pageNum === 1) console.log(`  Page ${pageNum}: ${pageItems.length} items (total: ${items.length})`);

    if (pageNum >= maxPages) break;

    // Next page
    const hasNext = await page.evaluate(`(() => {
      var currentPage = ${pageNum};
      var links = document.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) {
        var t = (links[i].innerText || '').trim();
        if (t === String(currentPage + 1) && (links[i].getAttribute('href') || '').indexOf('Page') >= 0) {
          links[i].click(); return true;
        }
      }
      return false;
    })()`);
    if (!hasNext) break;
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1000);
    pageNum++;
  }

  // Save progressively
  allCodes.push(...items);
  completedCategories.push(catName);
  saveState();
  console.log(`  ✅ ${catName}: ${items.length} codes`);
  return items;
}

// ── PHASE 2 ─────────────────────────────────────────────────────

async function getPriceForCode(page: Page, item: InsumoCode): Promise<InsumoComplete> {
  // Search the code
  await goToTree(page);
  await page.fill('#ctl00_MainContent_txtBusca', item.code);
  await page.click('#ctl00_MainContent_imgBtnPesquisaServico');
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);

  if (page.url().includes("home.aspx")) {
    await login(page);
    await goToTree(page);
    await page.fill('#ctl00_MainContent_txtBusca', item.code);
    await page.click('#ctl00_MainContent_imgBtnPesquisaServico');
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
  }

  // Click the result
  try {
    await page.locator("a", { hasText: item.code }).first().click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
  } catch {
    return { codigo: item.code, descricao: item.desc, unidade: item.unit, tipo: item.categoria, categoria: item.categoria, regiao: "São Paulo", data_preco: "", preco: 0 };
  }

  // Extract price — look for table with Data Preço column
  const detail = await page.evaluate(`(() => {
    var tables = document.querySelectorAll('table');
    for (var t = 0; t < tables.length; t++) {
      var rows = tables[t].querySelectorAll('tr');
      for (var r = 0; r < rows.length; r++) {
        var cells = rows[r].querySelectorAll('td');
        for (var c = 0; c < cells.length; c++) {
          var text = (cells[c].innerText || '').trim();
          if (text.match(/^20[0-9]{2}\\/[0-9]{2}$/)) {
            var tipo = '';
            var preco = 0;
            // tipo is usually 1-2 cells before date
            for (var b = c - 1; b >= 0; b--) {
              var bt = (cells[b].innerText || '').trim();
              if (bt.length > 2 && bt.length < 30 && !bt.match(/^[0-9]/) && bt !== 'h' && bt !== 'un' && bt !== 'kg' && bt !== 'm') {
                tipo = bt; break;
              }
            }
            // preco is usually the cell after date
            if (c + 1 < cells.length) {
              var pt = (cells[c+1].innerText || '').trim();
              preco = parseFloat(pt.replace(/\\./g, '').replace(',', '.')) || 0;
            }
            return { tipo: tipo, data_preco: text, preco: preco };
          }
        }
      }
    }
    return null;
  })()`);

  return {
    codigo: item.code,
    descricao: item.desc,
    unidade: item.unit,
    tipo: detail?.tipo || item.categoria,
    categoria: item.categoria,
    regiao: "São Paulo",
    data_preco: detail?.data_preco || "",
    preco: detail?.preco || 0,
  };
}

async function main(): Promise<void> {
  loadState();
  console.log("🚀 TCPO Insumos v4 — Amostra (100 MAT + MO completa + EQ completo)\n");

  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  try {
    await login(page);

    // PHASE 1
    if (completedCategories.length < CATEGORIES_CONFIG.length) {
      console.log("═══ PHASE 1: Collecting codes ═══");
      for (const cfg of CATEGORIES_CONFIG) {
        await collectCategory(page, cfg.name, cfg.maxPages);
      }
      console.log(`\n📋 Total codes: ${allCodes.length}`);
    }

    // PHASE 2
    console.log("\n═══ PHASE 2: Getting prices ═══\n");
    const remaining = allCodes.filter(c => !completedCodes.includes(c.code));
    console.log(`${remaining.length} remaining, ${completedCodes.length} done\n`);

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const result = await getPriceForCode(page, item);
      allInsumos.push(result);
      completedCodes.push(item.code);

      if ((i + 1) % 5 === 0 || result.preco > 0) {
        const withPrice = allInsumos.filter(x => x.preco > 0).length;
        console.log(`  [${i + 1}/${remaining.length}] ${item.code} — R$${result.preco} | ${result.tipo} (${withPrice} com preço)`);
        saveState();
      }
    }

    saveState();
    const withPrice = allInsumos.filter(x => x.preco > 0).length;
    console.log(`\n🏁 Done! ${allInsumos.length} insumos, ${withPrice} com preço`);
  } catch (err) {
    console.error("Fatal:", err);
    saveState();
  } finally {
    try { await page.goto("https://tcpoweb.pini.com.br/Logout.aspx", { timeout: 10000 }); console.log("Logged out"); } catch {}
    await browser.close();
  }
}

main();
