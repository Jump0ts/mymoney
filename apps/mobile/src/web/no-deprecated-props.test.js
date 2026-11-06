// En JavaScript (como web/pwa.test.js) para poder leer ficheros con node:fs sin anadir @types/node al proyecto.
// React Native Web avisa en la consola de que `pointerEvents` como propiedad esta obsoleto: va dentro de `style`.
const fs = require('node:fs');
const path = require('node:path');

const srcDir = path.resolve(__dirname, '..');

const sourceFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });

describe('propiedades obsoletas', () => {
  it('ningun componente usa pointerEvents como propiedad (va en style)', () => {
    const offenders = sourceFiles(srcDir)
      .filter((file) => /\bpointerEvents\s*=/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(srcDir, file));

    expect(offenders).toEqual([]);
  });
});
