const fs = require('node:fs');
const path = require('node:path');

const { contentSecurityPolicy } = require('./web-headers');
const { renderNginxConf } = require('./web-nginx');

const TEMPLATE = fs.readFileSync(path.resolve(__dirname, '../../../deploy/vps/web-nginx/nginx.conf.template'), 'utf8');
const CSP = contentSecurityPolicy({ apiUrl: 'https://api.ejemplo.dev', scriptHashes: ["'sha256-abc='"] });

describe('renderNginxConf', () => {
  const conf = renderNginxConf(TEMPLATE, CSP);

  it('inserta la CSP completa y no deja marcadores sin sustituir', () => {
    expect(conf).toContain(`add_header Content-Security-Policy "${CSP}" always;`);
    expect(conf).not.toContain('__CSP__');
  });

  it('rechaza una plantilla sin marcador o con el marcador repetido', () => {
    expect(() => renderNginxConf('server {}', CSP)).toThrow('exactamente una vez (hay 0)');
    expect(() => renderNginxConf('# __CSP__ add_header X "__CSP__";', CSP)).toThrow('exactamente una vez (hay 2)');
  });

  it('rechaza una CSP que rompería la cadena entre comillas', () => {
    expect(() => renderNginxConf(TEMPLATE, 'default-src "x"')).toThrow('caracteres');
    expect(() => renderNginxConf(TEMPLATE, 'a\nb')).toThrow('caracteres');
  });

  it('no interpreta los patrones especiales de String.replace', () => {
    expect(renderNginxConf('x "__CSP__" y', "a $& b $1 c")).toBe('x "a $& b $1 c" y');
  });
});

describe('plantilla del servidor de la web', () => {
  it('pone las cabeceras de seguridad una sola vez cada una', () => {
    for (const header of [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Cross-Origin-Opener-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security',
      'Cache-Control',
    ]) {
      expect(TEMPLATE.match(new RegExp(`add_header ${header} `, 'g'))).toHaveLength(1);
    }
  });

  it('no repite add_header dentro de un location (anularia las del servidor)', () => {
    const afterFirstLocation = TEMPLATE.slice(TEMPLATE.indexOf('location '));
    expect(afterFirstLocation).not.toContain('add_header');
  });

  it('solo admite GET y HEAD, sin root y sin escribir fuera de /tmp', () => {
    expect(TEMPLATE).toContain('if ($request_method !~ ^(GET|HEAD)$)');
    expect(TEMPLATE).toContain('listen 8080');
    expect(TEMPLATE).toContain('pid /tmp/nginx.pid;');
    expect(TEMPLATE).toContain('server_tokens off;');
  });

  it('un fichero estatico inexistente da 404 y las rutas de la app caen en index.html', () => {
    expect(TEMPLATE).toMatch(/try_files \$uri =404;/);
    expect(TEMPLATE).toContain('try_files $uri $uri.html /index.html;');
  });

  it('los ficheros con hash se cachean para siempre y el HTML se revalida', () => {
    expect(TEMPLATE).toContain('~^/_expo/static/ "public, max-age=31536000, immutable";');
    expect(TEMPLATE).toContain('default "public, max-age=0, must-revalidate";');
  });
});
