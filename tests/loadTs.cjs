const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');

// Compile in memory using the existing TypeScript dependency, with native APIs mocked.
function loadTs(filename, mocks = {}, globals = {}) {
  const absolute = path.resolve(__dirname, '..', filename);
  const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const nativeRequire = createRequire(absolute);
  const module = { exports: {} };
  const requireDependency = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(absolute), name);
      for (const suffix of ['.ts', '.tsx']) {
        if (fs.existsSync(target + suffix)) return loadTs(path.relative(path.resolve(__dirname, '..'), target + suffix), mocks, globals);
      }
    }
    return nativeRequire(name);
  };
  new Function('require', 'module', 'exports', ...Object.keys(globals), source)(requireDependency, module, module.exports, ...Object.values(globals));
  return module.exports;
}
module.exports = { loadTs };
