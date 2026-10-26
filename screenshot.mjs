// node screenshot.mjs <url> [label] [width] [height] [full|view] [scrollY]
import puppeteer from 'puppeteer-core';
import { mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const [url = 'http://localhost:3000', label = '', width = '1440', height = '900', mode = 'full', scrollY = '0'] = process.argv.slice(2);
const chromePaths = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = chromePaths.find(existsSync);
if (!executablePath) throw new Error('Chrome/Edge not found');

const dir = './temporary screenshots';
await mkdir(dir, { recursive: true });
const n = (await readdir(dir)).map((f) => Number(/^screenshot-(\d+)/.exec(f)?.[1])).filter(Boolean).reduce((a, b) => Math.max(a, b), 0) + 1;
const out = `${dir}/screenshot-${n}${label ? '-' + label : ''}.png`;

const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const w = Number(width);
await page.setViewport({ width: w, height: Number(height), deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));
if (mode === 'full') {
  // scroll through once so scroll-triggered reveals fire
  await page.evaluate(async () => {
    const step = innerHeight * 0.6;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
    scrollTo(0, 0); await new Promise((r) => setTimeout(r, 400));
  });
} else if (Number(scrollY)) {
  await page.evaluate((y) => scrollTo(0, y), Number(scrollY));
  await new Promise((r) => setTimeout(r, 900));
}
await page.screenshot({ path: out, fullPage: mode === 'full' });
const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
console.log(out, overflow.sw > overflow.cw ? `HORIZONTAL OVERFLOW ${overflow.sw}>${overflow.cw}` : 'no horizontal overflow');
await browser.close();
