/**
 * Full-page screenshots of every screen, at every breakpoint we design for.
 *
 * Usage:
 *   npx tsx scripts/ui-screenshots.ts --out screenshots/before --base https://sysco-app.vercel.app
 *   npx tsx scripts/ui-screenshots.ts --out screenshots/after  --base http://localhost:3000
 *
 * Credentials come from `.env.local` (UI_TEST_EMAIL / UI_TEST_PASSWORD), which is
 * gitignored. They are never written to a file, printed, or passed on the command
 * line — the sign-in form is the only place they are used.
 */
import { config } from "dotenv";
import { type Browser, type Page, chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

config({ path: ".env.local", quiet: true });

const WIDTHS = [375, 768, 1280, 1440, 1920] as const;

/** Signed-out screens are shot first, before the session exists. */
const PUBLIC_ROUTES = [
  { name: "login", path: "/login" },
  { name: "signup", path: "/signup" },
];

const PRIVATE_ROUTES = [
  { name: "dashboard", path: "/dashboard" },
  { name: "tasks", path: "/dashboard/tasks" },
  { name: "leaderboard", path: "/dashboard/leaderboard" },
  { name: "profile", path: "/dashboard/profile" },
  { name: "admin-tasks", path: "/dashboard/admin/tasks" },
  { name: "admin-attendance", path: "/dashboard/admin/attendance" },
  { name: "admin-members", path: "/dashboard/admin/members" },
  { name: "lead-tasks", path: "/dashboard/lead/tasks" },
  { name: "lead-attendance", path: "/dashboard/lead/attendance" },
  { name: "lead-members", path: "/dashboard/lead/members" },
];

interface Args {
  out: string;
  base: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const read = (flag: string, fallback: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  return {
    out: read("--out", "screenshots/current"),
    base: read("--base", "http://localhost:3000"),
  };
}

/** What a screenshot is worth measuring, beyond how it looks. */
interface Metrics {
  route: string;
  width: number;
  /** Full document height — how much scrolling the page costs. */
  pageHeight: number;
  /** Width of the content column, and of the area it sits in. */
  contentWidth: number;
  availableWidth: number;
  /** Unused horizontal space either side of the content. */
  wastedSide: number;
  horizontalScroll: boolean;
  /** Interactive targets smaller than the 32px (44px on mobile) minimum. */
  smallTargets: number;
  /** Text rendered below 13px. */
  tinyText: number;
  nodes: number;
}

async function measure(page: Page, route: string, width: number): Promise<Metrics> {
  return page.evaluate(
    ({ route, width }) => {
      const doc = document.documentElement;
      // The dashboard shell scrolls an inner div, not the document.
      const main = document.querySelector("main");
      const column = main?.firstElementChild as HTMLElement | null;
      const available = main?.getBoundingClientRect().width ?? window.innerWidth;
      const content = column?.getBoundingClientRect().width ?? available;

      const minTarget = width < 768 ? 44 : 32;
      let smallTargets = 0;
      for (const el of document.querySelectorAll("button, a, [role='button'], input, select")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.height < minTarget || r.width < 20) smallTargets += 1;
      }

      let tinyText = 0;
      for (const el of document.querySelectorAll("p, span, h1, h2, h3, li, td, th, label, div")) {
        if (!el.textContent?.trim() || el.children.length > 0) continue;
        if (Number.parseFloat(getComputedStyle(el).fontSize) < 13) tinyText += 1;
      }

      return {
        route,
        width,
        pageHeight: Math.max(
          doc.scrollHeight,
          (main?.parentElement as HTMLElement | null)?.scrollHeight ?? 0,
        ),
        contentWidth: Math.round(content),
        availableWidth: Math.round(available),
        wastedSide: Math.round(available - content),
        horizontalScroll: doc.scrollWidth > doc.clientWidth + 1,
        smallTargets,
        tinyText,
        nodes: document.querySelectorAll("*").length,
      };
    },
    { route, width },
  );
}

/**
 * The dashboard shell is `h-screen overflow-hidden` with an inner scroller, so
 * `fullPage` would only ever capture one viewport. Growing the viewport to the
 * scroller's height is what actually gets the whole page into the frame.
 */
async function shoot(page: Page, file: string, width: number) {
  const height = await page.evaluate(() => {
    const scroller = document.querySelector("main")?.parentElement;
    return Math.max(
      document.documentElement.scrollHeight,
      scroller?.scrollHeight ?? 0,
      window.innerHeight,
    );
  });
  await page.setViewportSize({ width, height: Math.min(height, 12000) });
  await page.waitForTimeout(400);
  await page.screenshot({ path: file });
  await page.setViewportSize({ width, height: 900 });
}

async function signIn(page: Page, base: string) {
  const email = process.env.UI_TEST_EMAIL;
  const password = process.env.UI_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("UI_TEST_EMAIL / UI_TEST_PASSWORD are missing from .env.local");
  }

  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname.startsWith("/dashboard"), null, {
    timeout: 45_000,
  });
  await page.waitForTimeout(3000);
  console.log("signed in");
}

async function capture(
  browser: Browser,
  base: string,
  out: string,
  routes: { name: string; path: string }[],
  authenticated: boolean,
) {
  const results: Metrics[] = [];

  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 120)}`));

    if (authenticated) await signIn(page, base);

    for (const route of routes) {
      await page.goto(`${base}${route.path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3500);

      // A guard may have bounced us somewhere else; record where we landed.
      const landed = await page.evaluate(() => location.pathname);
      if (landed !== route.path) {
        console.log(`  ${route.name} @${width}: redirected to ${landed} — skipped`);
        continue;
      }

      const metrics = await measure(page, route.name, width);
      results.push(metrics);
      await shoot(page, path.join(out, `${route.name}-${width}.png`), width);
    }

    if (problems.length > 0) console.log(`  @${width} errors:`, [...new Set(problems)]);
    await context.close();
  }

  return results;
}

async function main() {
  const { out, base } = parseArgs();
  await mkdir(out, { recursive: true });
  console.log(`base=${base}  out=${out}\n`);

  const browser = await chromium.launch();
  try {
    const results = [
      ...(await capture(browser, base, out, PUBLIC_ROUTES, false)),
      ...(await capture(browser, base, out, PRIVATE_ROUTES, true)),
    ];

    const header =
      "route".padEnd(18) +
      "w".padEnd(6) +
      "content".padEnd(9) +
      "avail".padEnd(7) +
      "wasted".padEnd(8) +
      "height".padEnd(8) +
      "hScroll".padEnd(9) +
      "small".padEnd(7) +
      "tiny".padEnd(6) +
      "nodes";
    const lines = results.map(
      (m) =>
        m.route.padEnd(18) +
        String(m.width).padEnd(6) +
        String(m.contentWidth).padEnd(9) +
        String(m.availableWidth).padEnd(7) +
        String(m.wastedSide).padEnd(8) +
        String(m.pageHeight).padEnd(8) +
        String(m.horizontalScroll).padEnd(9) +
        String(m.smallTargets).padEnd(7) +
        String(m.tinyText).padEnd(6) +
        String(m.nodes),
    );

    console.log(`\n${header}\n${lines.join("\n")}`);
    await writeFile(path.join(out, "metrics.json"), JSON.stringify(results, null, 2));
    console.log(`\n${results.length} screenshots → ${out}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
