// esbuild drops module-level directives when bundling, so restore "use client" on the
// React entry for Next.js App Router consumers.
import { readFileSync, writeFileSync } from 'node:fs';

for (const file of ['dist/index.js', 'dist/index.cjs']) {
  const src = readFileSync(file, 'utf8');
  if (!/^\s*['"]use client['"]/.test(src)) writeFileSync(file, `'use client';\n${src}`);
}
