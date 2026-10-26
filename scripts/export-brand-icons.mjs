import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'assets/brand');
const images = join(root, 'assets/images');
const adminAssets = join(root, '../sessly-admin/assets');

const FONT_FILES = [
  '/System/Library/Fonts/Avenir Next.ttc',
  '/System/Library/Fonts/HelveticaNeue.ttc',
  '/System/Library/Fonts/Helvetica.ttc',
].filter((path) => {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
});

function render(svgPath, outPath, width) {
  const svg = readFileSync(svgPath);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: 'transparent',
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: true,
      defaultFontFamily: 'Avenir Next',
    },
  });
  const png = resvg.render().asPng();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  console.log('wrote', outPath, `(${width}px)`);
}

const mark = join(brand, 'sessly-mark.svg');
const appIcon = join(brand, 'sessly-app-icon.svg');
const logo = join(brand, 'sessly-logo.svg');
const mono = join(brand, 'sessly-mark-mono.svg');

render(mark, join(brand, 'sessly-mark-1024.png'), 1024);
render(appIcon, join(brand, 'sessly-app-icon-1024.png'), 1024);
render(appIcon, join(images, 'icon.png'), 1024);
render(appIcon, join(images, 'adaptive-icon.png'), 1024);
render(appIcon, join(images, 'splash-icon.png'), 512);
render(appIcon, join(images, 'favicon.png'), 48);
render(logo, join(brand, 'sessly-logo-1280.png'), 1280);
{
  const svg = readFileSync(mono, 'utf8');
  // Preview mono on light ground so cutouts/strokes stay visible in brand folder.
  const framed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#F8FAFC"/>${svg.replace(/<\?xml[^>]*>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}</svg>`;
  writeFileSync(
    join(brand, 'sessly-mark-mono-1024.png'),
    new Resvg(framed, { fitTo: { mode: 'width', value: 1024 } }).render().asPng(),
  );
  console.log('wrote', join(brand, 'sessly-mark-mono-1024.png'), '(1024px)');
  render(mono, join(images, 'android-icon-monochrome.png'), 1024);
}

// Android adaptive layers
render(appIcon, join(images, 'android-icon-foreground.png'), 1024);
writeFileSync(
  join(images, 'android-icon-background.png'),
  new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="96" y1="64" x2="928" y2="960" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#C4B5FD"/><stop offset="40%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#5B21B6"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/></svg>`,
    { fitTo: { mode: 'width', value: 1024 } },
  )
    .render()
    .asPng(),
);

// Admin app icons
try {
  mkdirSync(adminAssets, { recursive: true });
  copyFileSync(join(images, 'icon.png'), join(adminAssets, 'icon.png'));
  copyFileSync(join(images, 'splash-icon.png'), join(adminAssets, 'splash-icon.png'));
  copyFileSync(join(images, 'favicon.png'), join(adminAssets, 'favicon.png'));
  copyFileSync(join(images, 'android-icon-foreground.png'), join(adminAssets, 'android-icon-foreground.png'));
  copyFileSync(join(images, 'android-icon-background.png'), join(adminAssets, 'android-icon-background.png'));
  copyFileSync(join(images, 'android-icon-monochrome.png'), join(adminAssets, 'android-icon-monochrome.png'));
  console.log('synced icons → sessly-admin/assets');
} catch (error) {
  console.warn('admin icon sync skipped:', error.message);
}
