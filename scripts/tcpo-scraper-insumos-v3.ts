#!/usr/bin/env npx tsx
/**
 * TCPO Insumos Scraper v3 — Same approach as the successful compositions scraper.
 * Step 1: Navigate tree to collect ALL insumo codes from each category (with pagination)
 * Step 2: Search each code individually to get price detail
 *
 * Output: scripts/tcpo-output/tcpo-insumos-complete.json
 */

import { chromium, type Page } from "playwright";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HOME_URL = "https://tcpoweb.pini.com.br/home/home.aspx";
const TREE_URL = "https://tcpoweb.pini.com.br/PesqServicosTreeView.aspx";
const EMAIL = "andre@anf.com.br";
const PASSWORD = "andre@anf";

const OUTPUT_DIR = join(import.meta.dirname || ".", "tcpo-output");
const OUTPUT_FILE = join(OUTPUT_DIR, "tcpo-insumos-complete.json");
const CODES_FILE = join(OUTPUT_DIR, "tcpo-insumos-codes.json");
const CHECKPOINT_FILE = join(OUTPUT_DIR, "tcpo-insumos-v3-checkpoint.json");

const INSUMO_CATEGORIES = [
  "Materiais",
  "Mão de obra",
  "Mão de obra empreitada",
  "Serviços terceirizados",
  "Equipamentos - Aquisição",
  "Equipamentos - Locação",
];

interface InsumoCode {
  code: string;
  desc: string;
  unit: string;
  categoria: string;
}

interface InsumoComplete {
  codigo: string;
  descricao: string;
  unidade: string;
  tipo: string;
  categoria: string;
  regiao: string;
  data_preco: string;
  preco: number;
}

let allCodes: InsumoCode[] = [];
let allInsumos: InsumoComplete[] = [];
let completedCodes: string[] = [];

function loadState(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  if (existsSync(CODES_FILE)) allCodes = JSON.parse(readFileSync(CODES_FILE, "utf-8"));
  if (existsSync(OUTPUT_FILE)) allInsumos = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
  if (existsSync(CHECKPOINT_FILE)) completedCodes = JSON.parse(readFileSync(CHECKPOINT_FILE, "utf-8"));
  console.log(`Loaded: ${allCodes.length} codes, ${allInsumos.length} insumos done, ${completedCodes.length} checkpointed`);
}

function saveState(): void {
  writeFileSync(CODES_FILE, JSON.stringify(allCodes, null, 2), "utf-8");
  writeFileSync(OUTPUT_FILE, JSON.stringify(allInsumos, null, 2), "utf-8");
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(completedCodes), "utf-8");
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
    if (page.url().includes("Menu.aspx") || bodyText.includes("Sair")) {
      console.log("✅ Login OK");
      return;
    }
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
  // Switch to PREÇOS PINI
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

// ── PHASE 1: Collect all codes from tree ────────────────────────

async function collectCodesFromCategory(page: Page, catName: string): Promise<InsumoCode[]> {
  console.log(`\n📂 Collecting: ${catName}`);
  await goToTree(page);

  // Expand Insumos node first
  await page.evaluate(() => {
    const links = document.querySelectorAll('a');
    for (const l of links) { if (l.innerText?.trim() === 'Insumos') { l.click(); return; } }
  });
  await page.waitForTimeout(1500);

  // Click category
  const clicked = await page.evaluate((name: string) => {
    const links = document.querySelectorAll('a');
    for (const l of links) { if (l.innerText?.trim() === name) { l.click(); return true; } }
    return false;
  }, catName);

  if (!clicked) { console.log(`  ❌ Category not found: ${catName}`); return []; }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);

  const items: InsumoCode[] = [];
  let pageNum = 1;

  while (true) {
    // Extract items from current page
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
            items.push({ code: code, desc: desc, unit: unit, categoria: '${catName}' });
          }
        }
      }
      return items;
    })()`);

    items.push(...pageItems);
    console.log(`  Page ${pageNum}: ${pageItems.length} items (total: ${items.length})`);

    // Try next page
    const hasNext = await page.evaluate(`(() => {
      var links = document.querySelectorAll('a');
      // Look for numbered page links
      var currentPage = ${pageNum};
      for (var i = 0; i < links.length; i++) {
        var t = (links[i].innerText || '').trim();
        var h = links[i].getAttribute('href') || '';
        if (t === String(currentPage + 1) && h.indexOf('Page') >= 0) {
          links[i].click();
          return true;
        }
      }
      // Look for "Últ." or ">" link
      for (var j = 0; j < links.length; j++) {
        var text = (links[j].innerText || '').trim();
        if ((text === '>' || text === '...') && links[j].getAttribute('href')?.indexOf('Page') >= 0) {
          links[j].click();
          return true;
        }
      }
      return false;
    })()`);

    if (!hasNext) break;
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
    pageNum++;
  }

  console.log(`  ✅ ${catName}: ${items.length} codes collected`);
  return items;
}

// ── PHASE 2: Get price for each code via search ─────────────────

async function getInsumoPrice(page: Page, code: string): Promise<{ tipo: string; data_preco: string; preco: number } | null> {
  // Search for the exact code
  await goToTree(page);
  await page.fill('#ctl00_MainContent_txtBusca', code);
  await page.click('#ctl00_MainContent_imgBtnPesquisaServico');
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);

  // Check if redirected (session expired)
  if (page.url().includes("home.aspx")) {
    await login(page);
    await goToTree(page);
    await page.fill('#ctl00_MainContent_txtBusca', code);
    await page.click('#ctl00_MainContent_imgBtnPesquisaServico');
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
  }

  // Click the result
  try {
    await page.locator("a", { hasText: code }).first().click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
  } catch {
    return null;
  }

  // Extract price detail
  const detail = await page.evaluate(`(() => {
    var body = document.body.innerText;
    var lines = body.split('\\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.match(/20[0-9]{2}\\/[0-9]{2}/)) {
        // Find table cells for this row
        var tables = document.querySelectorAll('table');
        for (var t = 0; t < tables.length; t++) {
          var rows = tables[t].querySelectorAll('tr');
          for (var r = 0; r < rows.length; r++) {
            var cells = rows[r].querySelectorAll('td');
            for (var c = 0; c < cells.length; c++) {
              var ct = (cells[c].innerText || '').trim();
              if (ct.match(/^20[0-9]{2}\\/[0-9]{2}$/)) {
                var tipo = c > 0 ? (cells[c-1].innerText || '').trim() : '';
                var precoText = c+1 < cells.length ? (cells[c+1].innerText || '').trim() : '0';
                var preco = parseFloat(precoText.replace(/\\./g, '').replace(',', '.')) || 0;
                return { tipo: tipo, data_preco: ct, preco: preco };
              }
            }
          }
        }
      }
    }
    return null;
  })()`);

  return detail;
}

async function main(): Promise<void> {
  loadState();
  console.log("🚀 TCPO Insumos Scraper v3\n");

  const browser = await chromium.launch({ headless: true, slowMo: 100 });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  try {
    await login(page);

    // PHASE 1: Collect all codes (if not already done)
    if (allCodes.length === 0) {
      console.log("═══ PHASE 1: Collecting all insumo codes ═══\n");
      for (const cat of INSUMO_CATEGORIES) {
        const codes = await collectCodesFromCategory(page, cat);
        allCodes.push(...codes);
      }
      saveState();
      console.log(`\n📋 Total codes collected: ${allCodes.length}`);
    } else {
      console.log(`📋 Using ${allCodes.length} previously collected codes`);
    }

    // PHASE 2: Get price for each code
    console.log("\n═══ PHASE 2: Getting prices ═══\n");

    const remaining = allCodes.filter(c => !completedCodes.includes(c.code));
    console.log(`${remaining.length} codes remaining (${completedCodes.length} already done)\n`);

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];

      const detail = await getInsumoPrice(page, item.code);

      allInsumos.push({
        codigo: item.code,
        descricao: item.desc,
        unidade: item.unit,
        tipo: detail?.tipo || item.categoria,
        categoria: item.categoria,
        regiao: "São Paulo",
        data_preco: detail?.data_preco || "",
        preco: detail?.preco || 0,
      });

      completedCodes.push(item.code);

      if ((i + 1) % 10 === 0 || detail?.preco) {
        const withPrice = allInsumos.filter(ins => ins.preco > 0).length;
        console.log(`  [${i + 1}/${remaining.length}] ${item.code} — R$${detail?.preco || 0} (${withPrice} com preço)`);
        saveState();
      }
    }

    saveState();
    const withPrice = allInsumos.filter(ins => ins.preco > 0).length;
    console.log(`\n🏁 Done! ${allInsumos.length} insumos, ${withPrice} com preço`);
  } catch (err) {
    console.error("Fatal:", err);
    saveState();
  } finally {
    try {
      await page.goto("https://tcpoweb.pini.com.br/Logout.aspx", { timeout: 10000 });
      console.log("Logged out");
    } catch {}
    await browser.close();
  }
}

main();
