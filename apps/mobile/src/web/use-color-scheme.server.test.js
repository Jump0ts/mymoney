// En JavaScript (como pwa.test.js) porque react-dom/server no tiene tipos en este proyecto.
// El HTML estatico de la web se genera en Node: ahi el esquema de color no se conoce y tiene que salir siempre "light"
// (lo que el navegador espera al hidratar), sea cual sea el del sistema del que lo genera.
const { createElement } = require('react');
const { renderToString } = require('react-dom/server');

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => 'dark' }));

const { useColorScheme } = require('../hooks/use-color-scheme.web');

describe('useColorScheme (web) al generar el HTML estatico', () => {
  it('devuelve "light" aunque el sistema este en oscuro', () => {
    const Probe = () => createElement('span', null, String(useColorScheme()));

    expect(renderToString(createElement(Probe))).toContain('>light<');
  });
});
