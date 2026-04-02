#!/usr/bin/env npx tsx
/**
 * TCPO Scraper v2 — Uses search instead of tree navigation
 *
 * Strategy: search for terms related to each category, collect results,
 * click into each composition to extract details + insumos.
 *
 * Usage: cd ~/orcabot && npx tsx scripts/tcpo-scraper.ts
 * Output: scripts/tcpo-output/tcpo-composicoes.json
 */

import { chromium, type Page } from "playwright";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const HOME_URL = "https://tcpoweb.pini.com.br/home/home.aspx";
const TREE_URL = "https://tcpoweb.pini.com.br/PesqServicosTreeView.aspx";
const EMAIL = "andre@anf.com.br";
const PASSWORD = "andre@anf";

const OUTPUT_DIR = join(import.meta.dirname || ".", "tcpo-output");
const OUTPUT_FILE = join(OUTPUT_DIR, "tcpo-composicoes.json");
const CHECKPOINT_FILE = join(OUTPUT_DIR, "tcpo-checkpoint.json");

const SEARCH_TERMS = [
  // 02. Serviços Iniciais
  { term: "canteiro de obras", cat: "02. Serviços Iniciais" },
  { term: "demolicao", cat: "02. Serviços Iniciais" },
  { term: "limpeza terreno", cat: "02. Serviços Iniciais" },
  { term: "locacao de obra", cat: "02. Serviços Iniciais" },
  { term: "movimento de terra", cat: "02. Serviços Iniciais" },
  { term: "escavacao", cat: "02. Serviços Iniciais" },
  { term: "aterro", cat: "02. Serviços Iniciais" },
  { term: "sondagem", cat: "02. Serviços Iniciais" },
  // 04. Infraestrutura
  { term: "fundacao", cat: "04. Infraestrutura" },
  { term: "estaca", cat: "04. Infraestrutura" },
  { term: "sapata", cat: "04. Infraestrutura" },
  { term: "baldrame", cat: "04. Infraestrutura" },
  { term: "radier", cat: "04. Infraestrutura" },
  { term: "bloco de coroamento", cat: "04. Infraestrutura" },
  // 05. Superestrutura
  { term: "concreto armado", cat: "05. Superestrutura" },
  { term: "forma madeira", cat: "05. Superestrutura" },
  { term: "forma metalica", cat: "05. Superestrutura" },
  { term: "armacao aco", cat: "05. Superestrutura" },
  { term: "laje", cat: "05. Superestrutura" },
  { term: "pilar concreto", cat: "05. Superestrutura" },
  { term: "viga concreto", cat: "05. Superestrutura" },
  // 06. Alvenarias (já feito — checkpoint vai pular)
  { term: "alvenaria", cat: "06. Alvenarias" },
  { term: "bloco ceramico", cat: "06. Alvenarias" },
  { term: "divisoria", cat: "06. Alvenarias" },
  // 09. Coberturas
  { term: "telhado", cat: "09. Coberturas" },
  { term: "telha ceramica", cat: "09. Coberturas" },
  { term: "telha fibrocimento", cat: "09. Coberturas" },
  { term: "telha metalica", cat: "09. Coberturas" },
  { term: "estrutura madeira telhado", cat: "09. Coberturas" },
  { term: "cumeeira", cat: "09. Coberturas" },
  { term: "calha", cat: "09. Coberturas" },
  // 10. Impermeabilização
  { term: "impermeabilizacao", cat: "10. Impermeabilização" },
  { term: "manta asfaltica", cat: "10. Impermeabilização" },
  { term: "argamassa polimerica", cat: "10. Impermeabilização" },
  // 11. Isolamento
  { term: "isolamento termico", cat: "11. Isolamento" },
  { term: "isolamento acustico", cat: "11. Isolamento" },
  { term: "la de vidro", cat: "11. Isolamento" },
  // 12. Esquadrias
  { term: "porta madeira", cat: "12. Esquadrias" },
  { term: "porta aluminio", cat: "12. Esquadrias" },
  { term: "janela aluminio", cat: "12. Esquadrias" },
  { term: "janela madeira", cat: "12. Esquadrias" },
  { term: "porta correr", cat: "12. Esquadrias" },
  { term: "fechadura", cat: "12. Esquadrias" },
  // 13. Sistemas hidráulicos
  { term: "tubo pvc esgoto", cat: "13. Sist. Hidráulicos" },
  { term: "tubo pvc agua", cat: "13. Sist. Hidráulicos" },
  { term: "registro gaveta", cat: "13. Sist. Hidráulicos" },
  { term: "registro pressao", cat: "13. Sist. Hidráulicos" },
  { term: "caixa sifonada", cat: "13. Sist. Hidráulicos" },
  { term: "ralo sifonado", cat: "13. Sist. Hidráulicos" },
  { term: "vaso sanitario", cat: "13. Sist. Hidráulicos" },
  { term: "torneira", cat: "13. Sist. Hidráulicos" },
  { term: "caixa dagua", cat: "13. Sist. Hidráulicos" },
  // 15. Prevenção incêndio
  { term: "hidrante", cat: "15. Prev. Incêndio" },
  { term: "extintor", cat: "15. Prev. Incêndio" },
  { term: "sprinkler", cat: "15. Prev. Incêndio" },
  // 16. Sistemas elétricos
  { term: "eletroduto", cat: "16. Sist. Elétricos" },
  { term: "cabo eletrico", cat: "16. Sist. Elétricos" },
  { term: "disjuntor", cat: "16. Sist. Elétricos" },
  { term: "tomada eletrica", cat: "16. Sist. Elétricos" },
  { term: "interruptor eletrico", cat: "16. Sist. Elétricos" },
  { term: "quadro distribuicao", cat: "16. Sist. Elétricos" },
  { term: "luminaria", cat: "16. Sist. Elétricos" },
  // 19. Ar condicionado
  { term: "ar condicionado", cat: "19. Ar Condicionado" },
  { term: "duto ar condicionado", cat: "19. Ar Condicionado" },
  // 20-24 (já feito — checkpoint vai pular)
  { term: "chapisco", cat: "20. Revestimentos" },
  { term: "emboco", cat: "20. Revestimentos" },
  { term: "reboco", cat: "20. Revestimentos" },
  { term: "massa corrida", cat: "20. Revestimentos" },
  { term: "forro gesso", cat: "21. Forros" },
  { term: "forro pvc", cat: "21. Forros" },
  { term: "forro madeira", cat: "21. Forros" },
  { term: "forro mineral", cat: "21. Forros" },
  { term: "piso ceramico", cat: "22. Pisos" },
  { term: "porcelanato", cat: "22. Pisos" },
  { term: "contrapiso", cat: "22. Pisos" },
  { term: "piso laminado", cat: "22. Pisos" },
  { term: "piso vinilico", cat: "22. Pisos" },
  { term: "rodape", cat: "22. Pisos" },
  { term: "azulejo", cat: "23. Rev. Paredes" },
  { term: "revestimento ceramico", cat: "23. Rev. Paredes" },
  { term: "pastilha", cat: "23. Rev. Paredes" },
  { term: "pintura latex", cat: "24. Pinturas" },
  { term: "pintura acrilica", cat: "24. Pinturas" },
  { term: "pintura esmalte", cat: "24. Pinturas" },
  { term: "textura parede", cat: "24. Pinturas" },
  { term: "verniz", cat: "24. Pinturas" },
  { term: "massa pva", cat: "24. Pinturas" },
  // 26. Louças e metais
  { term: "lavatorio", cat: "26. Louças e Metais" },
  { term: "bacia sanitaria", cat: "26. Louças e Metais" },
  { term: "pia cozinha", cat: "26. Louças e Metais" },
  { term: "tanque lavar", cat: "26. Louças e Metais" },
  { term: "chuveiro", cat: "26. Louças e Metais" },
  { term: "misturador", cat: "26. Louças e Metais" },
  // 27. Vidros
  { term: "vidro temperado", cat: "27. Vidros" },
  { term: "vidro laminado", cat: "27. Vidros" },
  { term: "espelho", cat: "27. Vidros" },
  // 30. Urbanização
  { term: "meio fio", cat: "30. Urbanização" },
  { term: "pavimentacao asfalto", cat: "30. Urbanização" },
  { term: "calcada", cat: "30. Urbanização" },
  { term: "muro", cat: "30. Urbanização" },
  { term: "gradil", cat: "30. Urbanização" },
];

interface Insumo {
  codigo: string;
  descricao: string;
  unidade: string;
  classe: string;
  coeficiente: number;
  preco_unitario: number;
  total: number;
  consumo: number;
}

interface Composicao {
  codigo: string;
  descricao: string;
  unidade: string;
  categoria: string;
  search_term: string;
  regiao: string;
  data_precos: string;
  ls_percentual: number;
  bdi_percentual: number;
  custo_sem_taxas: number;
  custo_com_taxas: number;
  insumos: Insumo[];
}

let allComposicoes: Composicao[] = [];
let completedSearches: string[] = [];

function loadState(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  if (existsSync(OUTPUT_FILE)) {
    allComposicoes = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
  }
  if (existsSync(CHECKPOINT_FILE)) {
    completedSearches = JSON.parse(readFileSync(CHECKPOINT_FILE, "utf-8"));
  }
  console.log(`Loaded: ${allComposicoes.length} composições, ${completedSearches.length} searches done`);
}

function saveState(): void {
  writeFileSync(OUTPUT_FILE, JSON.stringify(allComposicoes, null, 2), "utf-8");
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(completedSearches), "utf-8");
}

async function login(page: Page): Promise<void> {
  console.log("Logging in...");

  // Auto-dismiss any dialogs (session conflict alerts)
  page.on("dialog", async (dialog) => {
    console.log(`  Dialog: ${dialog.message()}`);
    await dialog.dismiss().catch(() => {});
  });

  // Go to home
  await page.goto(HOME_URL, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(1000);

  // Check if already logged in
  const hasSair = await page.$('a[href*="Logout"]');
  if (hasSair) {
    console.log("Already logged in");
    return;
  }

  // Fill login and submit
  await page.fill('input[placeholder="Usuário"]', EMAIL);
  await page.fill('input[placeholder="Senha"]', PASSWORD);
  await page.click('input[value="Entrar"]');
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(3000);

  // Retry login with increasing backoff until session is free
  for (let attempt = 1; attempt <= 10; attempt++) {
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));

    if (page.url().includes("Menu.aspx") || bodyText.includes("Sair")) {
      console.log("Login successful!");
      return;
    }

    if (bodyText.includes("Acesso negado")) {
      const waitSec = attempt * 30; // 30s, 60s, 90s, ...
      console.log(`Session conflict (attempt ${attempt}/10) — waiting ${waitSec}s...`);
      await page.click("text=OK").catch(() => {});
      await page.waitForTimeout(waitSec * 1000);
      // Retry
      await page.goto(HOME_URL, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(1000);
      await page.fill('input[placeholder="Usuário"]', EMAIL);
      await page.fill('input[placeholder="Senha"]', PASSWORD);
      await page.click('input[value="Entrar"]');
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(3000);
      continue;
    }

    // Check if logged in
    if (page.url().includes("Menu.aspx")) {
      console.log("Login successful!");
      return;
    }

    const hasSairNow = await page.$('a[href*="Logout"]');
    if (hasSairNow) {
      console.log("Login successful (Sair link found)");
      return;
    }

    throw new Error(`Login failed unexpectedly. URL: ${page.url()}`);
  }

  throw new Error("Login failed after 10 attempts — session never freed");

  // Verify we're actually logged in by checking for "Sair" link
  const loggedIn = await page.$('a[href*="Logout"]');
  if (!loggedIn) {
    // May still be on home — check if URL went to Menu
    if (page.url().includes("Menu.aspx")) {
      console.log("Login successful (on Menu)");
    } else {
      throw new Error("Login failed — no Sair link and not on Menu.aspx");
    }
  }

  // Navigate to compositions tree view
  // Try direct navigation first
  await page.goto(TREE_URL, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  if (!page.url().includes("PesqServicos")) {
    // Direct nav failed — go via Menu
    console.log("Direct nav to tree failed, going via Menu...");
    await page.goto("https://tcpoweb.pini.com.br/Menu.aspx", { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1000);
    // Click "Composições e preços" link
    const compLink = await page.$('a[href*="PesqServicosTreeView"]');
    if (compLink) {
      await compLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    } else {
      throw new Error("Could not find link to PesqServicosTreeView on Menu page");
    }
  }

  // Final verify — must be on tree page
  if (!page.url().includes("PesqServicos")) {
    throw new Error(`Not on tree page after login. URL: ${page.url()}`);
  }

  console.log(`✅ Logged in and on tree: ${page.url()}`);
}

async function goToSearch(page: Page): Promise<void> {
  if (!page.url().includes("PesqServicosTreeView")) {
    await page.goto(TREE_URL, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(1000);
  }
  // Switch base to TCPO PINI
  const base = await page.$('select[id*="ddlBases"]');
  if (base) {
    const val = await base.inputValue();
    if (!val.includes("TCPO_PINI")) {
      await base.selectOption("TCPO_PINI|1|");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    }
  }
}

async function search(page: Page, term: string): Promise<string[]> {
  await goToSearch(page);

  // Fill search box using Playwright fill (triggers ASP.NET events)
  await page.fill('#ctl00_MainContent_txtBusca', term);
  await page.click('#ctl00_MainContent_imgBtnPesquisaServico');
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // If we got redirected to home (session expired), re-login
  if (page.url().includes("home.aspx") || page.url().includes("Login")) {
    console.log("  Session expired during search — re-logging in...");
    await login(page);
    await goToSearch(page);
    await page.fill('#ctl00_MainContent_txtBusca', term);
    await page.click('#ctl00_MainContent_imgBtnPesquisaServico');
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
  }

  // Extract all composition codes from search results
  // The results table has columns: Base | Item (link) | Descrição | Unidade
  const codes = await page.evaluate(() => {
    const results: string[] = [];
    const links = document.querySelectorAll("a");
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const text = (link as HTMLElement).innerText?.trim() || "";
      // Composition codes: "3R 05 12 00 00 00 05 27" or "02.105.000085.SER" etc
      if (text.match(/^[\dA-Z][\dA-Z\.\s]+[\dA-Z]$/) && text.length > 5 && href.includes("__doPostBack")) {
        results.push(text);
      }
    }
    return results;
  });

  console.log(`  Search "${term}": ${codes.length} results`);
  return codes;
}

async function extractDetail(page: Page): Promise<Omit<Composicao, "categoria" | "search_term"> | null> {
  const EXTRACT_SCRIPT = `(() => {
    var body = document.body.innerText;
    function parseBR(s) { if (!s) return 0; return parseFloat(s.replace(/\\./g, "").replace(",", ".")) || 0; }
    if (!body.includes("Código:")) return null;
    var headerMatch = body.match(/Código:\\s*(.+?)(?:\\n|$)/);
    if (!headerMatch) return null;
    var headerLine = headerMatch[1];
    var codMatch = headerLine.match(/^([\\w\\s\\.]+?)\\s+-\\s+/);
    var unidMatch = headerLine.match(/Unidade:\\s*(\\S+)/);
    var codigo = codMatch && codMatch[1] ? codMatch[1].trim() : "";
    var unidade = unidMatch && unidMatch[1] ? unidMatch[1] : "";
    if (!codigo) return null;
    var descMatch = body.match(/Descrição:\\s*(.+?)(?:\\n|$)/);
    var descricao = descMatch && descMatch[1] ? descMatch[1].trim() : "";
    var regiaoEl = document.querySelector('select[id*="ddlRegiao"]');
    var regiao = regiaoEl && regiaoEl.selectedOptions && regiaoEl.selectedOptions[0] ? regiaoEl.selectedOptions[0].text.trim() : "São Paulo";
    var dataEl = document.querySelector('select[id*="ddlDataPrecos"]');
    var dataPrecos = dataEl && dataEl.selectedOptions && dataEl.selectedOptions[0] ? dataEl.selectedOptions[0].text.trim() : "";
    var lsMatch = body.match(/LS:\\s*([\\d\\.,]+)/);
    var bdiMatch = body.match(/BDI:\\s*([\\d\\.,]+)/);
    var ls = parseBR(lsMatch ? lsMatch[1] : "");
    var bdi = parseBR(bdiMatch ? bdiMatch[1] : "");
    var semMatch = body.match(/Sem taxas:\\s*([\\d\\.,]+)/);
    var comMatch = body.match(/Com taxas:\\s*([\\d\\.,]+)/);
    var semTaxas = parseBR(semMatch ? semMatch[1] : "");
    var comTaxas = parseBR(comMatch ? comMatch[1] : "");

    // Parse insumos from HTML table (not innerText — tabs get lost in headless)
    var insumos = [];
    var tables = document.querySelectorAll("table");
    for (var t = 0; t < tables.length; t++) {
      var headerRow = tables[t].querySelector("tr");
      if (!headerRow) continue;
      var headerCells = headerRow.querySelectorAll("td, th");
      var headerTexts = [];
      for (var h = 0; h < headerCells.length; h++) headerTexts.push((headerCells[h].innerText || "").trim());
      var headerJoined = headerTexts.join(" ");
      // Insumos table header contains: Código Descrição Un Class Coef Preço
      if (headerJoined.indexOf("Código") < 0 || headerJoined.indexOf("Class") < 0) continue;
      if (headerJoined.indexOf("Coef") < 0 && headerJoined.indexOf("Consumo") < 0) continue;

      var rows = tables[t].querySelectorAll("tr");
      for (var r = 1; r < rows.length; r++) {
        var cells = rows[r].querySelectorAll("td");
        if (cells.length < 5) continue;
        var c0 = (cells[0].innerText || "").trim();
        if (!c0 || !c0.match(/[0-9A-Z]/)) continue;
        // Skip "Total" summary rows
        if (c0.indexOf("Total") >= 0) continue;

        var precoCell = cells.length > 5 ? cells[5] : null;
        var precoInput = precoCell ? precoCell.querySelector("input") : null;
        var precoVal = precoInput ? precoInput.value : (precoCell ? (precoCell.innerText || "").trim() : "");

        insumos.push({
          codigo: c0,
          descricao: cells.length > 1 ? (cells[1].innerText || "").trim() : "",
          unidade: cells.length > 2 ? (cells[2].innerText || "").trim() : "",
          classe: cells.length > 3 ? (cells[3].innerText || "").trim() : "",
          coeficiente: cells.length > 4 ? parseBR((cells[4].innerText || "").trim()) : 0,
          preco_unitario: parseBR(precoVal),
          total: cells.length > 6 ? parseBR((cells[6].innerText || "").trim()) : 0,
          consumo: cells.length > 7 ? parseBR((cells[7].innerText || "").trim()) : 0
        });
      }
      if (insumos.length > 0) break;
    }

    return { codigo: codigo, descricao: descricao, unidade: unidade, regiao: regiao, data_precos: dataPrecos, ls_percentual: ls, bdi_percentual: bdi, custo_sem_taxas: semTaxas, custo_com_taxas: comTaxas, insumos: insumos };
  })()`;
  return page.evaluate(EXTRACT_SCRIPT) as Promise<Omit<Composicao, "categoria" | "search_term"> | null>;
}

async function clickResultByCode(page: Page, code: string): Promise<boolean> {
  try {
    // Use Playwright's locator to click the link with the exact code text
    const link = page.locator("a", { hasText: code }).first();
    const count = await link.count();
    if (count === 0) return false;
    await link.click();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2000);
    return true;
  } catch {
    return false;
  }
}

async function goBackFromDetail(page: Page): Promise<void> {
  // Click the orange "Voltar para:" bar or browser back
  const clicked = await page.evaluate(() => {
    // Try clicking any element containing "Voltar para"
    const all = document.querySelectorAll("a, span, td");
    for (const el of all) {
      if ((el as HTMLElement).innerText?.includes("Voltar para")) {
        (el as HTMLElement).click();
        return true;
      }
    }
    return false;
  });

  if (clicked) {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
  } else {
    await page.goBack({ waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1500);
  }
}

async function processSearchTerm(page: Page, term: string, cat: string): Promise<void> {
  if (completedSearches.includes(term)) {
    console.log(`⏭️  Skipping "${term}" (already done)`);
    return;
  }

  console.log(`\n🔍 Searching: "${term}" (${cat})`);
  const codes = await search(page, term);

  if (codes.length === 0) {
    completedSearches.push(term);
    saveState();
    return;
  }

  // Process each result
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    // Skip if already scraped
    if (allComposicoes.some((c) => c.codigo === code)) {
      console.log(`  ⏭️  ${code} (already have)`);
      continue;
    }

    const clicked = await clickResultByCode(page, code);
    if (!clicked) {
      console.log(`  ❌ Could not click: ${code}`);
      continue;
    }

    const detail = await extractDetail(page);
    if (detail && detail.codigo) {
      const comp: Composicao = { ...detail, categoria: cat, search_term: term };
      allComposicoes.push(comp);
      console.log(`  ✅ ${detail.codigo} — ${detail.descricao.substring(0, 50)}... (${detail.insumos.length} ins, R$${detail.custo_sem_taxas})`);
    } else {
      console.log(`  ⚠️  No detail extracted for result ${i}`);
    }

    // Go back to search results by re-searching
    await goToSearch(page);
    await page.fill('#ctl00_MainContent_txtBusca', term);
    await page.click('#ctl00_MainContent_imgBtnPesquisaServico');
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2000);

    // Check if session expired during navigation
    if (page.url().includes("home.aspx")) {
      console.log("  Session expired — re-logging in...");
      await login(page);
      await goToSearch(page);
      await page.fill('#ctl00_MainContent_txtBusca', term);
      await page.click('#ctl00_MainContent_imgBtnPesquisaServico');
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);
    }
  }

  completedSearches.push(term);
  saveState();
  console.log(`  💾 Saved (total: ${allComposicoes.length} composições)`);
}

async function main(): Promise<void> {
  loadState();

  console.log("🚀 TCPO Scraper v2 (search-based)");
  console.log(`${SEARCH_TERMS.length} search terms, output: ${OUTPUT_FILE}\n`);

  const browser = await chromium.launch({
    headless: true,
    slowMo: 100,
  });

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  try {
    await login(page);
    await goToSearch(page);

    for (const { term, cat } of SEARCH_TERMS) {
      try {
        await processSearchTerm(page, term, cat);
      } catch (err) {
        console.error(`❌ Error on "${term}":`, (err as Error).message);
        // Try to recover
        await goToSearch(page).catch(() => {});
      }
    }

    saveState();
    console.log(`\n🏁 Done! ${allComposicoes.length} composições scraped`);
  } catch (err) {
    console.error("Fatal:", err);
    saveState();
  } finally {
    // ALWAYS logout before closing to free server session
    try {
      await page.goto("https://tcpoweb.pini.com.br/Logout.aspx", { timeout: 10000 });
      await page.waitForTimeout(1000);
      console.log("Logged out successfully");
    } catch { /* ignore */ }
    await browser.close();
  }
}

main();
