#!/usr/bin/env node
// ============================================================
// bundle.js - packs the whole game into ONE shareable HTML file
// Usage: node tools/bundle.js  ->  dist/realtor-rivals.html
// Send that single file to anyone; it runs offline in any browser.
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Inline every <script src="..."> in order
const bundled = html.replace(
  /<script src="([^"]+)"><\/script>/g,
  (m, src) => {
    const code = fs.readFileSync(path.join(root, src), 'utf8');
    return '<script>\n' + code + '\n</script>';
  }
);

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'realtor-rivals.html');
fs.writeFileSync(outFile, bundled);

const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
console.log('Bundled -> ' + path.relative(process.cwd(), outFile) + ' (' + kb + ' KB)');
console.log('Share that single file - it runs offline in any browser.');
