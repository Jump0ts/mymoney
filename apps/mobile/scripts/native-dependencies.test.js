// Guarda contra una dependencia que importa un paquete que nadie instala. Pasó con react-native-svg 15.11.1: su codigo
// hacia `import { Buffer } from 'buffer'` sin declararlo, y `buffer` no estaba instalado. La web y los tests de Jest no
// lo notaban (no cargan ese codigo), pero el paquete nativo (Expo Go, iOS y Android) no compilaba:
//   Unable to resolve module buffer from react-native-svg/src/utils/fetchData.ts
// Aqui se recorren las fuentes de react-native-svg y se comprueba que cada paquete que importa esta instalado.
//
// En JavaScript (como los demas tests de scripts/) para poder leer ficheros con node:fs sin anadir @types/node al
// proyecto de la app, que solo tipa TypeScript de React Native.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const appDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(appDir, '../..');

const packageNameOf = (specifier) =>
  specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];

// Instalado = hay un node_modules/<paquete> en la app o en la raiz del monorepo. No vale require.resolve: un modulo de
// Node como `buffer` se resuelve solo, pero Metro no lo encuentra.
const isInstalled = (name, bases) =>
  bases.some((base) => fs.existsSync(path.join(base, 'node_modules', name, 'package.json')));

const sourceFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(full);
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name) ? [full] : [];
  });

const IMPORT = /(?:\bfrom|\bimport|\brequire\()\s*\(?\s*['"]([^'"./][^'"]*)['"]/g;

// Paquetes que importa el codigo de `sourceDir` (sin rutas relativas) y que no estan instalados.
const missingImports = (sourceDir, ownName, bases) => {
  const missing = new Set();
  for (const file of sourceFiles(sourceDir)) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(IMPORT)) {
      const name = packageNameOf(match[1]);
      if (name !== ownName && !isInstalled(name, bases)) missing.add(name);
    }
  }
  return [...missing].sort();
};

describe('missingImports', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'native-deps-'));
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(temp, file)), { recursive: true });
    fs.writeFileSync(path.join(temp, file), content);
  };

  afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

  it('detecta un paquete importado que no esta instalado, aunque sea un modulo de Node', () => {
    write('lib/src/a.ts', "import { Buffer } from 'buffer';\nimport { View } from 'react-native';\n");
    write('base/node_modules/react-native/package.json', '{}');

    expect(missingImports(path.join(temp, 'lib/src'), 'lib', [path.join(temp, 'base')])).toEqual(['buffer']);
  });

  it('no avisa de lo instalado, de rutas relativas, de su propio nombre ni de subrutas de un paquete instalado', () => {
    write('ok/src/a.ts', "import x from './b';\nimport y from 'ok/other';\nimport z from 'react-native/Libraries/Foo';\nimport { w } from '@scope/pkg/sub';\n");
    write('base/node_modules/react-native/package.json', '{}');
    write('base/node_modules/@scope/pkg/package.json', '{}');

    expect(missingImports(path.join(temp, 'ok/src'), 'ok', [path.join(temp, 'base')])).toEqual([]);
  });

  it('entiende import, from, require y import() dinamico', () => {
    write('forms/src/a.js', "const a = require('uno');\nconst b = import('dos');\nexport * from 'tres';\nimport 'cuatro';\n");

    expect(missingImports(path.join(temp, 'forms/src'), 'forms', [path.join(temp, 'base')])).toEqual([
      'cuatro',
      'dos',
      'tres',
      'uno',
    ]);
  });

  it('un paquete con alcance se identifica por sus dos primeras partes', () => {
    expect(packageNameOf('@scope/pkg/sub/path')).toBe('@scope/pkg');
    expect(packageNameOf('react-native/Libraries/Foo')).toBe('react-native');
  });
});

describe('dependencias nativas', () => {
  it('todo lo que importa react-native-svg esta instalado (si no, el paquete nativo no compila)', () => {
    const svgDir = [appDir, rootDir]
      .map((base) => path.join(base, 'node_modules', 'react-native-svg'))
      .find((dir) => fs.existsSync(dir));

    expect(svgDir).toBeDefined();
    expect(missingImports(path.join(svgDir, 'src'), 'react-native-svg', [appDir, rootDir])).toEqual([]);
  });
});
