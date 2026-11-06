import { act, renderHook } from '@testing-library/react-native';
import { useEffect, useState } from 'react';

import { useResetWhenChanged } from './useResetWhenChanged';

// Un componente con una pagina que se vuelve a 1 al cambiar el filtro. `commits` anota lo que de verdad se pinta
// (el efecto solo corre tras un render confirmado): si el reset llegara tarde saldria (filtro nuevo, pagina vieja).
const useFilteredPage = (filter: string) => {
  const [page, setPage] = useState(3);
  useResetWhenChanged(filter, () => setPage(1));
  const commits: string[] = [];
  return { page, setPage, commits };
};

const setup = (initial: string) => {
  const commits: string[] = [];
  const hook = renderHook(
    ({ filter }: { filter: string }) => {
      const result = useFilteredPage(filter);
      useEffect(() => {
        commits.push(`${filter}:${result.page}`);
      });
      return result;
    },
    { initialProps: { filter: initial } },
  );
  return { ...hook, commits };
};

describe('useResetWhenChanged', () => {
  it('la primera vez no resetea: conserva el estado inicial', () => {
    const { result } = setup('a');

    expect(result.current.page).toBe(3);
  });

  it('al cambiar la clave resetea el estado', () => {
    const { result, rerender } = setup('a');

    rerender({ filter: 'b' });

    expect(result.current.page).toBe(1);
  });

  it('nunca llega a pintarse el filtro nuevo con la pagina vieja (un efecto si lo dejaria pasar)', () => {
    const { rerender, commits } = setup('a');

    rerender({ filter: 'b' });

    expect(commits).not.toContain('b:3');
    expect(commits[commits.length - 1]).toBe('b:1');
  });

  it('con la misma clave no vuelve a resetear: el usuario puede cambiar de pagina', () => {
    const { result, rerender } = setup('a');
    act(() => result.current.setPage(2));

    rerender({ filter: 'a' });

    expect(result.current.page).toBe(2);
  });

  it('resetea cada vez que la clave cambia, y solo entonces', () => {
    const reset = jest.fn();
    const { rerender } = renderHook(({ key }: { key: string }) => useResetWhenChanged(key, reset), {
      initialProps: { key: 'a' },
    });
    expect(reset).not.toHaveBeenCalled();

    rerender({ key: 'b' });
    rerender({ key: 'b' });
    rerender({ key: 'c' });

    expect(reset).toHaveBeenCalledTimes(2);
  });
});
