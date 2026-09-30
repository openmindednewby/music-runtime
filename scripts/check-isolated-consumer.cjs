// Type-checks consumer-check/*.ts against the built dist the way an
// isolatedModules consumer would. Fails on any diagnostic in consumer.ts, on
// consumer-negative.ts not producing exactly its two expected errors, and on
// a `declare const enum` in the published types (unusable under isolatedModules).
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
if (!fs.existsSync(path.join(root, 'dist', 'index.d.ts'))) {
  console.error('dist/index.d.ts missing - run npm run build first');
  process.exit(1);
}
const failures = [];
for (const file of ['index.d.ts', 'index.d.mts']) {
  const p = path.join(root, 'dist', file);
  if (fs.existsSync(p) && /\bconst enum\b/.test(fs.readFileSync(p, 'utf8'))) {
    failures.push(`dist/${file} declares a const enum`);
  }
}
const options = {
  isolatedModules: true,
  noEmit: true,
  strict: true,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
  types: [],
};
const check = (name) =>
  ts.getPreEmitDiagnostics(ts.createProgram([path.join(root, 'consumer-check', name)], options));

for (const d of check('consumer.ts')) {
  failures.push('consumer.ts: ' + ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}
const EXPECTED_NEGATIVE_ERRORS = 2;
const negative = check('consumer-negative.ts');
if (negative.length !== EXPECTED_NEGATIVE_ERRORS) {
  failures.push(
    `consumer-negative.ts: expected ${EXPECTED_NEGATIVE_ERRORS} type errors (noise with freq, tone without), got ${negative.length}`,
  );
}
if (failures.length > 0) {
  console.error('isolatedModules consumer check FAILED:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log('isolatedModules consumer check passed');
