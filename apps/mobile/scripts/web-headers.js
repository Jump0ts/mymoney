#!/usr/bin/env node
/**
 * Genera dist/_headers (cabeceras de seguridad para un hosting estatico que las lea de ese fichero) para la web exportada con
 * `expo export --platform web`.
 *
 * La politica de contenido (CSP) no permite scripts en linea salvo los que la propia exportacion
 * genera, que se autorizan uno a uno por su hash SHA-256. El unico origen al que la web puede
 * conectarse, aparte de si misma, es el de EXPO_PUBLIC_API_URL: asi no hay dominios escritos a mano
 * que se queden desfasados.
 *
 * Uso:  EXPO_PUBLIC_API_URL=https://api.ejemplo.dev node scripts/web-headers.js [directorio-dist]
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

const sha256 = (text) => `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/** Hashes (para la CSP) de los scripts en linea de un conjunto de documentos HTML. */
const inlineScriptHashes = (htmlDocuments) => {
  const hashes = new Set();
  for (const html of htmlDocuments) {
    for (const match of html.matchAll(INLINE_SCRIPT)) {
      if (match[1].trim() !== '') hashes.add(sha256(match[1]));
    }
  }
  return [...hashes].sort();
};

/** Origen (esquema + host + puerto) de la API; exige https para que un build de produccion no hable en claro. */
const apiOrigin = (apiUrl) => {
  let url;
  try {
    url = new URL(apiUrl);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL no es una URL valida');
  }
  if (url.protocol !== 'https:') throw new Error('EXPO_PUBLIC_API_URL debe ser https');
  return url.origin;
};

/** Politica de contenido (CSP) de la web: la misma para `_headers` y para el nginx del VPS (scripts/web-nginx.js). */
const contentSecurityPolicy = ({ apiUrl, scriptHashes }) =>
  [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(' ')}`.trim(),
    // React Native Web inserta hojas de estilo en tiempo de ejecucion: es el unico uso de 'unsafe-inline'.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin(apiUrl)}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

const buildHeaders = ({ apiUrl, scriptHashes }) => {
  const csp = contentSecurityPolicy({ apiUrl, scriptHashes });

  return `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000

/_expo/static/*
  Cache-Control: public, max-age=31536000, immutable
`;
};

const htmlFilesIn = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFilesIn(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });

const main = () => {
  const dist = path.resolve(process.argv[2] ?? 'dist');
  if (!fs.existsSync(dist)) throw new Error(`No existe ${dist}: ejecuta antes "expo export --platform web"`);
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) throw new Error('Falta EXPO_PUBLIC_API_URL');

  const documents = htmlFilesIn(dist).map((file) => fs.readFileSync(file, 'utf8'));
  const headers = buildHeaders({ apiUrl, scriptHashes: inlineScriptHashes(documents) });
  fs.writeFileSync(path.join(dist, '_headers'), headers);
  console.log(`_headers escrito en ${dist} (${documents.length} paginas HTML, API ${apiOrigin(apiUrl)})`);
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`web-headers: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { apiOrigin, buildHeaders, contentSecurityPolicy, htmlFilesIn, inlineScriptHashes, sha256 };
