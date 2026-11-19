#!/usr/bin/env node
/**
 * After `expo export --platform web`, replace the root shell with a real
 * company landing (needed for Apple Developer enrollment) and publish
 * crawler-friendly /privacy + /terms pages.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const landingDir = path.join(root, 'web-landing');
const legalDir = path.join(root, 'docs', 'legal');

function mustExist(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdToHtmlDocument({ title, description, slug, markdown }) {
  const body = markdown
    .replace(/^#\s+(.+)$/m, '')
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^\*\*Ostatnia aktualizacja:/.test(trimmed) || /^Ostatnia aktualizacja:/.test(trimmed)) {
        return `<p class="meta">${escapeHtml(trimmed.replace(/\*\*/g, ''))}</p>`;
      }
      if (/^##\s+/.test(trimmed)) {
        return `<h2>${escapeHtml(trimmed.replace(/^##\s+/, ''))}</h2>`;
      }
      if (/^\|/.test(trimmed)) {
        return `<pre>${escapeHtml(trimmed)}</pre>`;
      }
      const withBold = escapeHtml(trimmed).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return `<p>${withBold.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | Sessly</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="https://sessly.pl/${slug}" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Manrope:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    body { margin:0; font-family: Manrope, sans-serif; background:#f7f2ff; color:#1a1030; }
    .wrap { width:min(820px, calc(100% - 2rem)); margin:0 auto; padding:2rem 0 4rem; }
    a { color:#6d28d9; }
    .back { display:inline-block; margin-bottom:1.5rem; font-weight:700; text-decoration:none; }
    h1 { font-family: Fraunces, Georgia, serif; font-size:clamp(1.8rem,4vw,2.4rem); margin:0 0 1rem; }
    h2 { font-family: Fraunces, Georgia, serif; margin:2rem 0 0.75rem; font-size:1.35rem; }
    p, pre { line-height:1.65; color:#4b4260; font-weight:500; }
    .meta { color:#6d28d9; font-weight:700; }
    pre { white-space:pre-wrap; background:#fff; padding:1rem; border-radius:12px; border:1px solid rgba(76,29,149,.12); }
    footer { margin-top:3rem; padding-top:1.25rem; border-top:1px solid rgba(76,29,149,.12); color:#5b5270; font-size:.92rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <a class="back" href="/">← Sessly</a>
    <h1>${escapeHtml(title)}</h1>
    ${body}
    <footer>
      SESSLY sp. z o.o. · ul. Wileńska 39 Box 99, 76-200 Słupsk · NIP 8393264130 ·
      <a href="mailto:support@sessly.pl">support@sessly.pl</a>
    </footer>
  </div>
</body>
</html>`;
}

function writeLegal(slug, title, description, mdFile) {
  const html = mdToHtmlDocument({
    title,
    description,
    slug,
    markdown: fs.readFileSync(path.join(legalDir, mdFile), 'utf8'),
  });
  // Expo static export may use nested folders; cover both shapes.
  fs.writeFileSync(path.join(dist, `${slug}.html`), html);
  const nested = path.join(dist, slug);
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(nested, 'index.html'), html);
}

mustExist(dist, 'expo dist');
mustExist(path.join(landingDir, 'index.html'), 'landing index.html');
mustExist(path.join(legalDir, 'PRIVACY.pl.md'), 'privacy markdown');
mustExist(path.join(legalDir, 'TERMS.pl.md'), 'terms markdown');

// Keep a copy of the Expo root shell for debugging, then replace with landing.
const expoIndex = path.join(dist, 'index.html');
if (fs.existsSync(expoIndex)) {
  fs.copyFileSync(expoIndex, path.join(dist, 'app-shell.html'));
}
fs.copyFileSync(path.join(landingDir, 'index.html'), expoIndex);

const brandDir = path.join(dist, 'brand');
fs.mkdirSync(brandDir, { recursive: true });
const markSrc = path.join(root, 'assets', 'images', 'sessly-mark.png');
mustExist(markSrc, 'sessly-mark.png');
fs.copyFileSync(markSrc, path.join(brandDir, 'sessly-mark.png'));

const faviconSrc = path.join(root, 'assets', 'images', 'favicon.png');
if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, path.join(dist, 'favicon.ico'));
}

writeLegal('privacy', 'Polityka prywatności Sessly', 'Polityka prywatności SESSLY sp. z o.o.', 'PRIVACY.pl.md');
writeLegal('terms', 'Regulamin Aplikacji Sessly dla Klientów', 'Regulamin Aplikacji Sessly dla Klientów', 'TERMS.pl.md');

console.log('Prepared web dist: company landing at /, legal at /privacy and /terms');
