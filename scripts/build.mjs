/*
 * بناء نسخة الإنتاج → dist/
 *
 * - يجمّع ملفات CSS و JS بنفس ترتيب ظهورها في index.html ثم يصغّرها.
 * - الدوال العامة (اللي بتتنادى من onclick في الـ HTML) بتفضل بأسمائها،
 *   لأن الملفات scripts عادية مش modules، فمفيش إعادة تسمية للأسماء العامة.
 * - يحدّث قائمة الملفات في الـ Service Worker عشان الأوفلاين يشتغل من أول زيارة.
 *
 * الاستخدام:  npm install  &&  npm run build
 */
import { transform } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const read = (p) => fs.readFile(path.join(ROOT, p), 'utf8');
const write = async (p, data) => {
  const full = path.join(DIST, p);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
};

const html = await read('index.html');
const cssFiles = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)"/g)].map((m) => m[1]);
const jsFiles = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map((m) => m[1]);
if (!cssFiles.length || !jsFiles.length) throw new Error('index.html لا يحتوي على ملفات css/js');

await fs.rm(DIST, { recursive: true, force: true });

// ---- CSS
const cssSrc = (await Promise.all(cssFiles.map(read))).join('\n');
const css = await transform(cssSrc, { loader: 'css', minify: true, legalComments: 'none', charset: 'utf8' });
await write('css/app.css', css.code);

// ---- JS (نفس ترتيب التحميل الأصلي؛ الفاصلة المنقوطة تمنع التصاق الملفات ببعض)
const jsSrc = (await Promise.all(jsFiles.map(read))).join('\n;\n');
const js = await transform(jsSrc, {
  loader: 'js',
  minify: true,
  legalComments: 'none',
  charset: 'utf8',
  target: 'esnext', // بدون تحويل صياغة: السلوك يفضل زي ما هو
});
await write('js/app.js', js.code);

// ---- HTML
const cssBlock = /(?:[ \t]*<link rel="stylesheet" href="css\/[^"]+">\n)+/;
const jsBlock = /(?:<script src="js\/[^"]+"><\/script>\n)+/;
if (!cssBlock.test(html) || !jsBlock.test(html)) throw new Error('تعذّر العثور على كتل css/js في index.html');
await write(
  'index.html',
  html
    .replace(cssBlock, '    <link rel="stylesheet" href="css/app.css">\n')
    .replace(jsBlock, '<script src="js/app.js"></script>\n'),
);

// ---- Service Worker: قائمة الملفات تبقى ملفين فقط
const swPath = 'firebase-messaging-sw.js';
const sw = await read(swPath);
const assetsRe = /const APP_ASSETS = \[[\s\S]*?\];/;
if (!assetsRe.test(sw)) throw new Error('APP_ASSETS غير موجودة في ' + swPath);
await write(swPath, sw.replace(assetsRe, "const APP_ASSETS = ['./css/app.css', './js/app.js'];"));

// ---- ملفات ثابتة
const STATIC = ['sw.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'videoplayback.m4a'];
for (const f of STATIC) await fs.copyFile(path.join(ROOT, f), path.join(DIST, f));
await fs.cp(path.join(ROOT, '.well-known'), path.join(DIST, '.well-known'), { recursive: true });

// ---- فحص نهائي
const out = await fs.readFile(path.join(DIST, 'js/app.js'), 'utf8');
const html2 = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
for (const name of ['loadContent', 'nav', 'hit', 'closeReader', 'toggleReaderInfo', 'pickReciter', 'openTafsir']) {
  if (!new RegExp(`function ${name}\\b`).test(out)) throw new Error(`الدالة العامة ${name} اتغيّر اسمها`);
}
if (/css\/base\.css|js\/core\//.test(html2)) throw new Error('index.html ما زال يشير للملفات المصدرية');

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
console.log(`dist/css/app.css  ${kb(css.code)}   (من ${cssFiles.length} ملف)`);
console.log(`dist/js/app.js    ${kb(js.code)}   (من ${jsFiles.length} ملف)`);
