const { apiOrigin, buildHeaders, inlineScriptHashes, sha256 } = require('./web-headers');

describe('sha256', () => {
  it('da el hash en base64 con el formato de la CSP', () => {
    // SHA-256("abc") en base64: valor de referencia conocido
    expect(sha256('abc')).toBe("'sha256-ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0='");
  });
});

describe('inlineScriptHashes', () => {
  it('solo cuenta los scripts en linea, no los externos ni los vacios', () => {
    const html = `
      <script src="/_expo/static/js/web/entry-abc.js" defer></script>
      <script type="module">globalThis.__EXPO_ROUTER_HYDRATE__=true;</script>
      <script>   </script>`;

    expect(inlineScriptHashes([html])).toEqual([sha256('globalThis.__EXPO_ROUTER_HYDRATE__=true;')]);
  });

  it('une y ordena los hashes de varias paginas sin repetir', () => {
    const a = '<script>uno()</script>';
    const b = '<script>dos()</script><script>uno()</script>';

    const hashes = inlineScriptHashes([a, b]);

    expect(hashes).toHaveLength(2);
    expect(hashes).toEqual([...hashes].sort());
  });

  it('no autoriza nada si no hay scripts en linea', () => {
    expect(inlineScriptHashes(['<html><body>hola</body></html>'])).toEqual([]);
  });
});

describe('apiOrigin', () => {
  it('se queda solo con el origen', () => {
    expect(apiOrigin('https://api.ejemplo.dev/api/health?x=1')).toBe('https://api.ejemplo.dev');
    expect(apiOrigin('https://api.ejemplo.dev:8443')).toBe('https://api.ejemplo.dev:8443');
  });

  it.each([['http://api.ejemplo.dev'], ['ftp://x.dev'], ['no es una url'], ['']])('rechaza %p', (value) => {
    expect(() => apiOrigin(value)).toThrow();
  });
});

describe('buildHeaders', () => {
  const headers = buildHeaders({ apiUrl: 'https://api.ejemplo.dev', scriptHashes: ["'sha256-abc='"] });
  const csp = headers.match(/Content-Security-Policy: (.*)/)[1];
  const directive = (name) => csp.split('; ').find((part) => part.startsWith(`${name} `));

  it('los scripts solo pueden ser propios o tener un hash autorizado', () => {
    expect(directive('script-src')).toBe("script-src 'self' 'sha256-abc='");
    expect(csp).not.toContain('unsafe-eval');
    expect(directive('script-src')).not.toContain('unsafe-inline');
  });

  it('solo se puede conectar a si misma y a la API', () => {
    expect(directive('connect-src')).toBe("connect-src 'self' https://api.ejemplo.dev");
  });

  it('no se puede incrustar, ni usar plugins, ni cambiar la base de las URLs', () => {
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive('object-src')).toBe("object-src 'none'");
    expect(directive('base-uri')).toBe("base-uri 'none'");
    expect(headers).toContain('X-Frame-Options: DENY');
  });

  it('lleva HSTS, nosniff, sin referrer y permisos del navegador desactivados', () => {
    expect(headers).toContain('Strict-Transport-Security: max-age=31536000');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('Referrer-Policy: no-referrer');
    expect(headers).toMatch(/Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
  });

  it('los ficheros con hash se cachean para siempre y el resto no', () => {
    expect(headers).toMatch(/\/_expo\/static\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
    expect(headers.match(/Cache-Control/g)).toHaveLength(1);
  });

  it('no se puede generar con una API que no sea https', () => {
    expect(() => buildHeaders({ apiUrl: 'http://api.ejemplo.dev', scriptHashes: [] })).toThrow('https');
  });
});
