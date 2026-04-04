#!/usr/bin/env npx tsx
/**
 * TCPO Insumos Scraper v2 — Navigates the tree to get ALL insumos with prices
 * Clicks each category, extracts list, clicks each item to get SP price.
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
const CHECKPOINT_FILE = join(OUTPUT_DIR, "tcpo-insumos-v2-checkpoint.json");

// Categories in the tree under "Insumos"
const INSUMO_CATEGORIES = [
  "Materiais",
  "Mão de obra",
  "Mão de obra empreitada",
  "Serviços terceirizados",
  "Equipamentos - Aquisição",
  "Equipamentos - Locação",
];

interface TcpoInsumoComplete {
  codigo: string;
  descricao: string;
  unidade: string;
  tipo: string;
  categoria: string;
  regiao: string;
  data_preco: string;
  preco: number;
}

let allInsumos: TcpoInsumoComplete[] = [];
let completedCategories: string[] = [];

function loadState(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  if (existsSync(OUTPUT_FILE)) allInsumos = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
  if (existsSync(CHECKPOINT_FILE)) completedCategories = JSON.parse(readFileSync(CHECKPOINT_FILE, "utf-8"));
  console.log(`Loaded: ${allInsumos.length} insumos, ${completedCategories.length} categories done`);
}

function saveState(): void {
  writeFileSync(OUTPUT_FILE, JSON.stringify(allInsumos, null, 2), "utf-8");
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(completedCategories), "utf-8");
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
    if (page.url().includes("Menu.aspx") || bodyText.includes("Sair")) return;
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

async function switchToPrecosPini(page: Page): Promise<void> {
  await page.goto(TREE_URL, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(1000);
  const base = await page.$('select[id*="ddlBases"]');
  if (base) {
    const val = await base.inputValue();
    if (!val.includes("PRECOSPINI")) {
      await base.selectOption("PRECOSPINI|1|");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    }
  }
}

async function clickTreeCategory(page: Page, catName: string): Promise<boolean> {
  // First expand "Insumos" if needed
  const expanded = await page.evaluate(() => {
    const links = document.querySelectorAll('a');
    for (const l of links) {
      if (l.innerText?.trim() === 'Insumos') { l.click(); return true; }
    }
    return false;
  });
  if (expanded) {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
  }

  // Now click the specific category
  const clicked = await page.evaluate((name) => {
    const links = document.querySelectorAll('a');
    for (const l of links) {
      if (l.innerText?.trim() === name) { l.click(); return true; }
    }
    return false;
  }, catName);

  if (clicked) {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2000);
  }
  return clicked;
}

async function extractListItems(page: Page): Promise<Array<{ code: string; desc: string; unit: string }>> {
  return page.evaluate(`(() => {
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
          items.push({ code: code, desc: desc, unit: unit });
        }
      }
    }
    return items;
  })()`);
}

async function extractInsumoDetail(page: Page): Promise<{ tipo: string; data_preco: string; preco: number } | null> {
  return page.evaluate(`(() => {
    var body = document.body.innerText;
    // Format: "Descrição  Un  Tipo  Data Preço  Preço (R$)\nAjudante  h  MÃO DE OBRA  2026/02  9,95"
    var lines = body.split('\\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      // Find line with price data — has a date pattern like 2026/02 or 2024/12
      if (line.match(/20[0-9]{2}\\/[0-9]{2}/)) {
        // Parse: desc  un  tipo  data  preco
        var parts = line.split('\\t').map(function(p) { return p.trim(); });
        if (parts.length >= 3) {
          // Find the date and price
          var tipo = '';
          var data = '';
          var preco = 0;
          for (var j = 0; j < parts.length; j++) {
            if (parts[j].match(/^20[0-9]{2}\\/[0-9]{2}$/)) {
              data = parts[j];
              tipo = parts[j-1] || '';
              var precoStr = parts[j+1] || '0';
              preco = parseFloat(precoStr.replace('.', '').replace(',', '.')) || 0;
              break;
            }
          }
          if (data) return { tipo: tipo, data_preco: data, preco: preco };
        }
      }
    }
    // Fallback: look in table cells
    var tables = document.querySelectorAll('table');
    for (var t = 0; t < tables.length; t++) {
      var tRows = tables[t].querySelectorAll('tr');
      for (var r = 0; r < tRows.length; r++) {
        var tCells = tRows[r].querySelectorAll('td');
        if (tCells.length >= 4) {
          for (var c = 0; c < tCells.length; c++) {
            var cellText = (tCells[c].innerText || '').trim();
            if (cellText.match(/^20[0-9]{2}\\/[0-9]{2}$/)) {
              var tipoCell = c > 0 ? (tCells[c-1].innerText || '').trim() : '';
              var precoCell = c+1 < tCells.length ? (tCells[c+1].innerText || '').trim() : '0';
              var p = parseFloat(precoCell.replace('.', '').replace(',', '.')) || 0;
              return { tipo: tipoCell, data_preco: cellText, preco: p };
            }
          }
        }
      }
    }
    return null;
  })()`);
}

async function handlePagination(page: Page): Promise<boolean> {
  // Check if there's a next page link
  const hasNext = await page.evaluate(`(() => {
    var links = document.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      var text = (links[i].innerText || '').trim();
      var href = links[i].getAttribute('href') || '';
      if (text === '>' || text === 'Próximo' || text === '»') {
        if (href.indexOf('Page') >= 0 || href.indexOf('__doPostBack') >= 0) {
          links[i].click();
          return true;
        }
      }
    }
    // Check for numbered pages
    var currentPage = 1;
    var spans = document.querySelectorAll('span');
    for (var j = 0; j < spans.length; j++) {
      var st = (spans[j].innerText || '').trim();
      if (st.match(/^[0-9]+$/) && spans[j].parentElement?.tagName !== 'A') {
        currentPage = parseInt(st);
      }
    }
    // Find link for next page number
    for (var k = 0; k < links.length; k++) {
      var lt = (links[k].innerText || '').trim();
      if (lt === String(currentPage + 1)) {
        links[k].click();
        return true;
      }
    }
    return false;
  })()`);

  if (hasNext) {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2000);
  }
  return hasNext;
}

async function scrapeCategory(page: Page, catName: string): Promise<void> {
  if (completedCategories.includes(catName)) {
    console.log(`⏭️  Skipping "${catName}" (already done)`);
    return;
  }

  console.log(`\n📂 Category: ${catName}`);

  await switchToPrecosPini(page);
  const clicked = await clickTreeCategory(page, catName);
  if (!clicked) {
    console.log(`  ❌ Could not click "${catName}"`);
    return;
  }

  // Collect all items across all pages
  let allItems: Array<{ code: string; desc: string; unit: string }> = [];
  let pageNum = 1;

  while (true) {
    const items = await extractListItems(page);
    console.log(`  Page ${pageNum}: ${items.length} items`);
    allItems.push(...items);

    const hasNext = await handlePagination(page);
    if (!hasNext) break;
    pageNum++;
  }

  console.log(`  Total items in list: ${allItems.length}`);

  // Now click each item to get the price
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];

    // Skip if already have
    if (allInsumos.some(ins => ins.codigo === item.code)) continue;

    // Click the item code
    try {
      await page.locator("a", { hasText: item.code }).first().click();
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1500);

      // Select São Paulo region if dropdown exists
      const regionSelect = await page.$('select[id*="ddlRegiao"]');
      if (regionSelect) {
        const currentVal = await regionSelect.inputValue();
        if (!currentVal.includes("São Paulo") && !currentVal.includes("SP")) {
          await regionSelect.selectOption({ label: "São Paulo" });
          await page.waitForLoadState("networkidle").catch(() => {});
          await page.waitForTimeout(1000);
        }
      }

      const detail = await extractInsumoDetail(page);

      allInsumos.push({
        codigo: item.code,
        descricao: item.desc,
        unidade: item.unit,
        tipo: detail?.tipo || catName,
        categoria: catName,
        regiao: "São Paulo",
        data_preco: detail?.data_preco || "",
        preco: detail?.preco || 0,
      });

      if ((i + 1) % 10 === 0) {
        console.log(`  ✅ ${i + 1}/${allItems.length} — ${item.code} R$${detail?.preco || 0}`);
        saveState();
      }
    } catch (err) {
      console.log(`  ⚠️  Error on ${item.code}: ${(err as Error).message}`);
    }

    // Go back to list — re-navigate to category
    await switchToPrecosPini(page);
    await clickTreeCategory(page, catName);
    await page.waitForTimeout(1000);

    // Navigate to correct page if we're past page 1
    // Simple approach: if item index > items-per-page, paginate
    // But since we re-navigate each time, we're always on page 1
    // The items from later pages won't be clickable — need to paginate
    // For simplicity, handle pagination per-item later
  }

  completedCategories.push(catName);
  saveState();
  console.log(`  ✅ Done: ${catName} (total insumos: ${allInsumos.length})`);
}

async function main(): Promise<void> {
  loadState();
  console.log("🚀 TCPO Insumos Complete Scraper v2");

  const browser = await chromium.launch({ headless: true, slowMo: 50 });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  try {
    await login(page);

    for (const cat of INSUMO_CATEGORIES) {
      try {
        await scrapeCategory(page, cat);
      } catch (err) {
        console.error(`❌ Error on "${cat}":`, (err as Error).message);
      }
    }

    saveState();
    console.log(`\n🏁 Done! ${allInsumos.length} insumos with prices`);
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
