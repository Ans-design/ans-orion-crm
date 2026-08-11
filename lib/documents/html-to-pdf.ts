/** Conversion HTML → PDF binaire (Chromium serverless Vercel + fallback local). */

export type HtmlToPdfResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; error: string };

/** Retire les contrôles d'impression navigateur avant génération PDF. */
export function stripPrintControls(html: string): string {
  return html
    .replace(/<button[^>]*class="print-btn[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '')
    .replace(/@media print \{ body \{ padding: 20px; \} \.no-print \{ display: none; \} \}/, '@media print { body { padding: 0; } .no-print { display: none; } }');
}

async function launchBrowser() {
  const puppeteer = await import('puppeteer-core');

  if (process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    const chromium = await import('@sparticuz/chromium');
    return puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    });
  }

  const localChrome = process.env.PUPPETEER_EXECUTABLE_PATH
    || process.env.CHROME_PATH
    || (process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/google-chrome');

  return puppeteer.default.launch({
    executablePath: localChrome,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
}

export async function htmlToPdfBuffer(html: string): Promise<HtmlToPdfResult> {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(stripPrintControls(html), { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '12mm', left: '10mm' },
    });
    return { ok: true, buffer: Buffer.from(pdf) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
