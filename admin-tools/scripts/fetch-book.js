#!/usr/bin/env node

/**
 * Storygraph Book Fetcher
 *
 * Searches app.thestorygraph.com for a book using a real Chromium browser
 * (Playwright) so Cloudflare sees a genuine browser fingerprint. Your session
 * cookies are injected before any navigation, so no re-challenge is needed.
 *
 * Uses ollama to pick search results, enrich metadata, and suggest country.
 *
 * Usage:
 *   npm run fetch-book
 *
 * Prerequisites:
 *   - Paste a "Copy as cURL" from DevTools when prompted — the script extracts
 *     your cf_clearance + _storygraph_session cookies automatically
 *   - ollama must be running locally with a capable model
 */

import chalk from "chalk";
import fs from "fs-extra";
import inquirer from "inquirer";
import path from "path";
import { spawnSync } from "child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STORYGRAPH_BASE = "https://app.thestorygraph.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";

const PREFERRED_MODELS = [
  "hf.co/unsloth/Qwen3.6-27B-GGUF:UD-Q4_K_XL",
  "qwen2.5:14b",
  "qwen2.5:7b",
  "llama3.1:8b",
  "mistral:7b",
  "llama3:8b",
];

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Extract cookie key=value pairs from whatever the user pastes.
 * Accepts: full curl command, -b '...' fragment, or raw cookie string.
 */
function extractCookies(input) {
  const text = input.trim();
  const bMatch = text.match(/-b\s+['"]([^'"]+)['"]/s);
  const cookieStr = bMatch ? bMatch[1] : text;

  const cookies = {};
  for (const part of cookieStr.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) cookies[key] = val;
  }
  return cookies;
}

/**
 * Convert flat cookies object to Playwright's cookie format.
 */
function toPlaywrightCookies(cookies) {
  return Object.entries(cookies).map(([name, value]) => ({
    name,
    value,
    domain: "app.thestorygraph.com",
    path: "/",
    httpOnly: false,
    secure: true,
    sameSite: "Lax",
  }));
}

// ---------------------------------------------------------------------------
// Browser fetch (Playwright — real Chromium, bypasses CF fingerprinting)
// ---------------------------------------------------------------------------

let _browser = null;
let _context = null;

async function initBrowser(playwrightCookies) {
  console.log(chalk.gray("  Launching Chromium..."));
  _browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  _context = await _browser.newContext({
    userAgent: USER_AGENT,
    locale: "en-GB",
    extraHTTPHeaders: {
      "Accept-Language": "en-GB,en;q=0.8",
    },
  });

  // Inject cookies BEFORE any navigation — CF won't re-challenge
  await _context.addCookies(playwrightCookies);

  // Mask webdriver property so basic bot checks don't trigger
  await _context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
}

async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
    _context = null;
  }
}

async function withPage(fn) {
  const page = await _context.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

async function checkForCFChallenge(page) {
  const title = await page.title();
  if (title === "Just a moment...") {
    throw new Error(
      "Cloudflare challenge triggered — cookies may be stale. " +
      "Open app.thestorygraph.com in your browser, then copy a fresh request as cURL."
    );
  }
}

/**
 * Search Storygraph and extract results directly from the DOM.
 * Returns array of { path, title, author }.
 */
async function searchStorygraph(query) {
  const url = `${STORYGRAPH_BASE}/browse?search_term=${encodeURIComponent(query)}`;
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await checkForCFChallenge(page);

    if (process.env.DEBUG) {
      await fs.writeFile("/tmp/sg-search-debug.html", await page.content());
      console.log(chalk.gray("[DEBUG] Search HTML saved to /tmp/sg-search-debug.html"));
    }

    // Extract from DOM — much more reliable than regex on the serialised HTML
    const results = await page.evaluate(() => {
      const seen = new Set();
      const out = [];

      // Each book card has a div with class containing book-title-author-and-series
      document.querySelectorAll('[class*="book-title-author-and-series"]').forEach((div) => {
        // Title link is in an h3 > a[href^="/books/"]
        const titleLink = div.querySelector('h3 a[href^="/books/"]');
        if (!titleLink) return;

        const bookPath = titleLink.getAttribute("href").split("?")[0];
        if (seen.has(bookPath)) return;
        seen.add(bookPath);

        const title = titleLink.textContent.trim();
        const authorLink = div.querySelector('a[href^="/authors/"]');
        const author = authorLink ? authorLink.textContent.trim() : "";

        out.push({ path: bookPath, title, author });
      });

      return out;
    });

    return results;
  });
}

/**
 * Fetch a book detail page and extract all metadata from the DOM.
 * Does everything in-browser — no regex on serialized HTML.
 */
async function fetchBookData(bookPath) {
  const url = `${STORYGRAPH_BASE}${bookPath}`;
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await checkForCFChallenge(page);

    if (process.env.DEBUG) {
      await fs.writeFile("/tmp/sg-book-debug.html", await page.content());
      console.log(chalk.gray("[DEBUG] Book HTML saved to /tmp/sg-book-debug.html"));
    }

    return page.evaluate((bookPath) => {
      // ── Title ──────────────────────────────────────────────────────────────
      // Most reliable: page title is "Book Title by Author | The StoryGraph"
      const pageTitle = document.title || "";
      const titleFromPage = pageTitle.includes(" by ")
        ? pageTitle.split(" by ")[0].trim()
        : pageTitle.split("|")[0].trim();
      // Also try the book-title-author-and-series h3
      const titleEl = document.querySelector('[class*="book-title-author-and-series"] h3');
      const title = titleEl?.textContent?.trim() || titleFromPage || null;

      // ── Author ─────────────────────────────────────────────────────────────
      const authorEl = document.querySelector('a[href^="/authors/"]');
      const author = authorEl?.textContent?.trim() || null;

      // ── Cover image ────────────────────────────────────────────────────────
      const coverEl = document.querySelector('img[src*="cdn.thestorygraph.com"]');
      const cover_image_url = coverEl?.src || null;

      // ── Page count ─────────────────────────────────────────────────────────
      const editionEl = document.querySelector('.toggle-edition-info-link');
      const editionText = editionEl?.textContent?.trim() || "";
      const pagesMatch = editionText.match(/(\d+)\s*pages?/i);
      const page_count = pagesMatch ? parseInt(pagesMatch[1]) : null;

      // ── Publication year ───────────────────────────────────────────────────
      // "first pub YYYY" appears in a <span> near the edition info
      const allText = document.body.innerText;
      const firstPubMatch = allText.match(/first pub\s+(\d{4})/i);
      const publication_year = firstPubMatch ? parseInt(firstPubMatch[1]) : null;

      // ── Rating ─────────────────────────────────────────────────────────────
      const allSpans = [...document.querySelectorAll("span")];
      const ratingSpan = allSpans.find((s) => /^[1-5]\.\d{2}$/.test(s.textContent.trim()));
      const average_storygraph_rating = ratingSpan ? parseFloat(ratingSpan.textContent.trim()) : null;

      // ── Ratings count ──────────────────────────────────────────────────────
      const ratingsMatch = allText.match(/([\d,]+)\s+ratings/i);
      const number_of_votes = ratingsMatch ? parseInt(ratingsMatch[1].replace(/,/g, "")) : null;

      // ── Full synopsis ──────────────────────────────────────────────────────
      // The full text is embedded in a <script> as the "Show More" replacement HTML.
      // Extract it from the inline script rather than relying on a click.
      let synopsis = null;
      const scripts = [...document.querySelectorAll("script:not([src])")];
      for (const script of scripts) {
        const src = script.textContent;
        if (src.includes("read-more-btn") && src.includes("trix-content")) {
          // Pull the HTML string from .html('...') call
          const m = src.match(/\.html\('([\s\S]+?)'\)\s*\}/);
          if (m) {
            // Unescape the JS string (basic)
            const inner = m[1]
              .replace(/\\'/g, "'")
              .replace(/\\"/g, '"')
              .replace(/\\\//g, "/")
              .replace(/\\n/g, " ");
            // Strip HTML tags
            const div = document.createElement("div");
            div.innerHTML = inner;
            synopsis = div.textContent.replace(/\s+/g, " ").trim();
            // Strip the "Description" heading if present
            synopsis = synopsis.replace(/^Description\s*/i, "").trim();
            break;
          }
        }
      }
      // Fallback: use whatever is visible in trix-content (truncated but better than nothing)
      if (!synopsis) {
        const visibleEl = document.querySelector("p.trix-content");
        synopsis = visibleEl?.textContent?.replace(/\.\.\.$/, "").trim() || null;
      }

      // ── Genre / mood tags ──────────────────────────────────────────────────
      // Genre tags: teal-coloured spans in the tag list
      const genreSpans = [...document.querySelectorAll("span[class*='teal']")]
        .map((s) => s.textContent.trim().toLowerCase())
        .filter((t) => t.length > 1 && t.length < 40 && !/^\d/.test(t));
      // Mood tags: the community mood items (top ones = most common)
      const moodItems = [...document.querySelectorAll(".mood-item span.font-medium")]
        .map((s) => s.textContent.trim().toLowerCase())
        .slice(0, 6); // top 6 moods
      const genre_tags = [...new Set([...genreSpans, ...moodItems])].slice(0, 10);

      return {
        title,
        author,
        synopsis,
        page_count,
        publication_year,
        genre_tags,
        cover_image_url,
        average_storygraph_rating,
        number_of_votes,
        _bookPath: bookPath,
      };
    }, bookPath);
  });
}

// ---------------------------------------------------------------------------
// Ollama helpers (sync via spawnSync + stdin — no shell quoting issues)
// ---------------------------------------------------------------------------

function getOllamaModel() {
  try {
    const result = spawnSync("ollama", ["list"], { encoding: "utf8" });
    if (result.status !== 0 || result.error) return null;
    const lines = result.stdout.split("\n").slice(1).filter(Boolean);
    const available = lines.map((l) => l.split(/\s+/)[0]);

    for (const preferred of PREFERRED_MODELS) {
      const found = available.find(
        (m) => m === preferred || m.startsWith(preferred.split(":")[0])
      );
      if (found) return found;
    }
    return available[0] || null;
  } catch {
    return null;
  }
}

function askOllama(model, prompt) {
  const payload = JSON.stringify({
    model,
    prompt,
    stream: false,
    options: { temperature: 0.3 },
    format: "json",
  });

  const result = spawnSync(
    "curl",
    ["-s", "-X", "POST", "http://localhost:11434/api/generate",
     "-H", "Content-Type: application/json",
     "--data-binary", "@-"],
    { input: payload, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }
  );

  if (result.error) throw result.error;
  const parsed = JSON.parse(result.stdout);
  return parsed.response || "";
}

function ollamaPickResult(model, query, results) {
  const list = results
    .map((r, i) => `${i}: title="${r.title}", author="${r.author}", path="${r.path}"`)
    .join("\n");

  const prompt =
    `You are a book search assistant. The user searched for: "${query}".\n` +
    `Here are the search results:\n${list}\n\n` +
    `Return a JSON object with a single key "index" (0-based integer) for the best match. ` +
    `If none match, return {"index": -1}. Return ONLY valid JSON.`;

  try {
    const json = JSON.parse(askOllama(model, prompt));
    return typeof json.index === "number" ? json.index : 0;
  } catch {
    return 0;
  }
}

function ollamaEnrichBook(model, rawData) {
  const prompt =
    `You are a book metadata assistant. Given this raw scraped book data, return a JSON object with:\n\n` +
    `- "genre_tags": array of 3-8 lowercase genre/mood/pace tags\n` +
    `- "synopsis": the synopsis. If longer than 400 characters, shorten it to ≤400 chars while staying true to the publisher's original intent — do not add interpretation, do not change the tone, just trim and tighten. If already ≤400 chars, return as-is.\n` +
    `- "country_suggestion": ISO 3166-1 alpha-2 country code of the author's nationality (educated guess).\n` +
    `- "country_confidence": "high", "medium", or "low".\n` +
    `- "country_reason": one short sentence explaining the guess.\n\n` +
    `Raw data:\n${JSON.stringify(rawData, null, 2)}\n\nReturn ONLY valid JSON.`;

  try {
    return JSON.parse(askOllama(model, prompt));
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Country flag helper
// ---------------------------------------------------------------------------

function countryCodeToFlag(code) {
  if (!code || code.length !== 2) return "🌍";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

async function main() {
  console.log(chalk.blue.bold("\n📚 BookSwipe — Storygraph Book Fetcher\n"));

  // ── 1. Get cookies ──────────────────────────────────────────────────────
  console.log(
    chalk.gray(
      "Paste your Storygraph session cookies.\n" +
      "Accepted formats:\n" +
      "  • A full `curl` command copied from DevTools (Copy as cURL)\n" +
      "  • Just the -b '...' cookie string\n" +
      "  • A raw cookie string (key=val; key2=val2)\n"
    )
  );

  const { rawCookie } = await inquirer.prompt([{
    type: "input",
    name: "rawCookie",
    message: "Paste cookie / curl command:",
    validate: (v) => v.trim().length > 10 || "Please paste a valid cookie string",
  }]);

  const cookies = extractCookies(rawCookie);

  if (!cookies["_storygraph_session"]) {
    console.log(chalk.yellow("⚠️  Warning: _storygraph_session cookie not found — fetching may fail."));
  }
  if (!cookies["cf_clearance"]) {
    console.log(chalk.yellow("⚠️  Warning: cf_clearance cookie not found — Cloudflare may block requests."));
    console.log(chalk.yellow("   Copy a request from DevTools Network tab to get both cookies.\n"));
  } else {
    console.log(chalk.green("✓ Cookies extracted (cf_clearance + session found).\n"));
  }

  const playwrightCookies = toPlaywrightCookies(cookies);

  // ── 2. Check ollama ──────────────────────────────────────────────────────
  const ollamaModel = getOllamaModel();
  if (!ollamaModel) {
    console.log(chalk.red("❌ ollama is not running or no models are available."));
    console.log(chalk.gray("   Start ollama and pull a model (e.g. `ollama pull llama3.1:8b`) then try again."));
    process.exit(1);
  }
  console.log(chalk.green(`✓ Using ollama model: ${chalk.bold(ollamaModel)}\n`));

  // ── 3. Launch browser once, reuse for all books ──────────────────────────
  process.stdout.write(chalk.gray("🌐 Starting browser... "));
  await initBrowser(playwrightCookies);
  console.log(chalk.green("ready.\n"));

  let continueAdding = true;

  try {
    while (continueAdding) {
      const { query } = await inquirer.prompt([{
        type: "input",
        name: "query",
        message: "Search query for the book (title + author works best):",
        validate: (v) => v.trim().length > 1 || "Please enter a search query",
      }]);

      console.log(chalk.gray(`\n🔍 Searching Storygraph for "${query}"...`));

      // ── 3a. Search via DOM ────────────────────────────────────────────────
      let results;
      try {
        results = await searchStorygraph(query);
      } catch (err) {
        console.log(chalk.red(`❌ Search failed: ${err.message}`));
        continue;
      }

      if (results.length === 0) {
        console.log(chalk.yellow("⚠️  No results found. Try a different search query."));
        continue;
      }

      console.log(chalk.blue(`\n  Found ${results.length} result(s). Asking ollama to pick the best match...`));

      // ── 3b. Ollama picks silently ─────────────────────────────────────────
      let chosenIdx = results.length > 1 ? ollamaPickResult(ollamaModel, query, results) : 0;
      chosenIdx = Math.max(0, Math.min(chosenIdx, results.length - 1));

      const pickedResult = results[chosenIdx];
      console.log(chalk.green(
        `\n✓ Selected: "${pickedResult.title}"` +
        (pickedResult.author ? ` by ${pickedResult.author}` : "") +
        chalk.gray(` (${pickedResult.path})`)
      ));

      // ── 3c. Fetch and parse the book page ─────────────────────────────────
      console.log(chalk.gray(`📖 Fetching book page...`));

      let rawBookData;
      try {
        rawBookData = await fetchBookData(pickedResult.path);
      } catch (err) {
        console.log(chalk.red(`❌ Failed to fetch book page: ${err.message}`));
        continue;
      }

      // Fill gaps from search result if DOM extraction missed anything
      if (!rawBookData.title) rawBookData.title = pickedResult.title;
      if (!rawBookData.author) rawBookData.author = pickedResult.author;

      console.log(chalk.gray(`\n  Title:  ${rawBookData.title || "?"}`));
      console.log(chalk.gray(`  Author: ${rawBookData.author || "?"}`));
      console.log(chalk.gray(`  Pages:  ${rawBookData.page_count || "?"}`));
      console.log(chalk.gray(`  Year:   ${rawBookData.publication_year || "?"}`));
      console.log(chalk.gray(`  Rating: ${rawBookData.average_storygraph_rating || "?"}`));

      // ── 3d. Enrich with ollama ─────────────────────────────────────────────
      console.log(chalk.blue("\n🤖 Asking ollama to enrich data..."));
      const enriched = ollamaEnrichBook(ollamaModel, rawBookData);

      const synopsis = enriched.synopsis || rawBookData.synopsis || "";
      const genre_tags = enriched.genre_tags?.length ? enriched.genre_tags : rawBookData.genre_tags;
      const countrySuggestion = (enriched.country_suggestion || "").toUpperCase();
      const countryConfidence = enriched.country_confidence || "low";
      const countryReason = enriched.country_reason || "";

      console.log(chalk.blue("\n🌍 Country of origin:"));
      console.log(chalk.gray(
        `   Ollama suggests: ${countryCodeToFlag(countrySuggestion)} ${countrySuggestion}` +
        ` (confidence: ${countryConfidence})`
      ));
      if (countryReason) console.log(chalk.gray(`   Reason: ${countryReason}`));

      // ── 3e. Confirm / override country ─────────────────────────────────────
      const { countryAnswer } = await inquirer.prompt([{
        type: "input",
        name: "countryAnswer",
        message: `Country code (2-letter ISO) — Enter to accept "${countrySuggestion}":`,
        default: countrySuggestion,
        validate: (v) =>
          /^[A-Za-z]{2}$/.test(v.trim()) || "Please enter a 2-letter ISO code (e.g. US, GB, FR)",
      }]);

      const countryCode = countryAnswer.trim().toUpperCase();
      const countryFlag = countryCodeToFlag(countryCode);

      // ── 3f. Suggester + pitch ──────────────────────────────────────────────
      const { suggester, pitch } = await inquirer.prompt([
        {
          type: "input",
          name: "suggester",
          message: "Who suggested this book?",
          validate: (v) => v.trim().length > 0 || "Please enter a name",
        },
        {
          type: "input",
          name: "pitch",
          message: "Their pitch to the club:",
          validate: (v) => v.trim().length > 0 || "Please enter a pitch",
        },
      ]);

      // ── 3g. Assemble final object ──────────────────────────────────────────
      const bookData = {
        title: rawBookData.title,
        author: rawBookData.author,
        country: countryFlag,
        synopsis,
        page_count: rawBookData.page_count,
        publication_year: rawBookData.publication_year,
        genre_tags,
        cover_image_url: rawBookData.cover_image_url,
        average_storygraph_rating: rawBookData.average_storygraph_rating,
        number_of_votes: rawBookData.number_of_votes,
        suggester: suggester.trim(),
        pitch: pitch.trim(),
      };

      // Strip nulls/undefineds
      for (const key of Object.keys(bookData)) {
        if (bookData[key] == null) delete bookData[key];
      }

      console.log(chalk.blue("\n📋 Final book data:"));
      console.log(chalk.gray(JSON.stringify(bookData, null, 2)));

      const { saveBook } = await inquirer.prompt([{
        type: "confirm",
        name: "saveBook",
        message: "Save this book?",
        default: true,
      }]);

      if (saveBook) {
        const slug = (bookData.title || "book")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        const outputPath = path.join(__dirname, "..", "data", "books", `${slug}.json`);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeJSON(outputPath, bookData, { spaces: 2 });
        console.log(chalk.green(`\n✅ Saved to: data/books/${slug}.json`));
      } else {
        console.log(chalk.gray("Book not saved."));
      }

      const { another } = await inquirer.prompt([{
        type: "confirm",
        name: "another",
        message: "Fetch another book?",
        default: true,
      }]);

      continueAdding = another;
    }
  } finally {
    await closeBrowser();
  }

  console.log(chalk.blue.bold("\n✨ Done! Run `npm run import-books` to push books to PocketBase.\n"));
}

main().catch(async (err) => {
  await closeBrowser();
  console.error(chalk.red(`\n❌ Unexpected error: ${err.message}`));
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
