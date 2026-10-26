#!/usr/bin/env node
/**
 * Genera la configuracion del nginx que sirve la web dentro de la imagen del despliegue (VPS).
 *
 * Parte de la plantilla deploy/vps/web-nginx/nginx.conf.template y sustituye __CSP__ por la politica de
 * contenido calculada igual que en dist/_headers (scripts/web-headers.js): los scripts en linea se autorizan
 * por su hash y la web solo puede conectarse a su propio origen y al de la API (EXPO_PUBLIC_API_URL).
 *
 * Uso:  EXPO_PUBLIC_API_URL=https://api.ejemplo.dev node scripts/web-nginx.js <dist> <plantilla> <salida>
 */
const fs = require('node:fs');
const path = require('node:path');

const { contentSecurityPolicy, htmlFilesIn, inlineScriptHashes } = require('./web-headers');

const PLACEHOLDER = '__CSP__';

/** Inserta la CSP en la plantilla. Se rechaza lo que rompería la cadena entre comillas de nginx. */
const renderNginxConf = (template, csp) => {
  const occurrences = template.split(PLACEHOLDER).length - 1;
  if (occurrences !== 1) throw new Error(`la plantilla debe contener ${PLACEHOLDER} exactamente una vez (hay ${occurrences})`);
  if (/["\\\r\n]/.test(csp)) throw new Error('la CSP contiene caracteres que no caben en una cadena de nginx');
  return template.replace(PLACEHOLDER, () => csp);
};

const main = () => {
  const [distArg, templateArg, outArg] = process.argv.slice(2);
  if (!distArg || !templateArg || !outArg) {
    throw new Error('uso: web-nginx.js <dist> <plantilla> <salida>');
  }
  const dist = path.resolve(distArg);
  if (!fs.existsSync(dist)) throw new Error(`No existe ${dist}: ejecuta antes "npm run build:web"`);
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) throw new Error('Falta EXPO_PUBLIC_API_URL');

  const documents = htmlFilesIn(dist).map((file) => fs.readFileSync(file, 'utf8'));
  const csp = contentSecurityPolicy({ apiUrl, scriptHashes: inlineScriptHashes(documents) });
  const conf = renderNginxConf(fs.readFileSync(path.resolve(templateArg), 'utf8'), csp);

  fs.mkdirSync(path.dirname(path.resolve(outArg)), { recursive: true });
  fs.writeFileSync(path.resolve(outArg), conf);
  console.log(`nginx.conf escrito en ${outArg} (${documents.length} paginas HTML)`);
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`web-nginx: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { renderNginxConf };
