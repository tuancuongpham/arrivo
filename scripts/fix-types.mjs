// tsc keeps the source's extensionless imports in declarations, which only bundler resolution
// accepts. Spell the extensions out so `moduleResolution: node16`/`nodenext` can follow them,
// and write a .d.cts twin of every file for CommonJS consumers: in a "type": "module" package a
// .d.ts describes an ES module.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const SPECIFIER = /((?:from|import)\s*\(?\s*)(['"])(\.{1,2}(?:\/[^'"]*)?)\2/g;

function declarations(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return declarations(path);
    return path.endsWith('.d.ts') ? [path] : [];
  });
}

const files = declarations('dist');
for (const file of files) {
  const dir = dirname(file);
  const esm = readFileSync(file, 'utf8').replace(SPECIFIER, (match, lead, quote, spec) => {
    if (/\.[cm]?js$/.test(spec)) return match;
    let target;
    if (existsSync(resolve(dir, `${spec}.d.ts`))) target = `${spec}.js`;
    else if (existsSync(resolve(dir, spec, 'index.d.ts'))) target = `${spec}/index.js`;
    else throw new Error(`${file}: cannot resolve ${spec}`);
    return `${lead}${quote}${target}${quote}`;
  });
  writeFileSync(file, esm);
  const cjs = esm.replace(SPECIFIER, (match, lead, quote, spec) => `${lead}${quote}${spec.replace(/\.js$/, '.cjs')}${quote}`);
  writeFileSync(file.replace(/\.d\.ts$/, '.d.cts'), cjs);
}
console.log(`fix-types: ${files.length} declarations, with .d.cts twins`);
