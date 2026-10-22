// Los tests vacian TODAS las tablas antes de cada caso (tests/setup.ts). Esta guarda impide que eso
// ocurra contra una base de datos que no sea de pruebas: el nombre de la base debe terminar en `_test`.

const TEST_DATABASE_SUFFIX = "_test";

export const databaseNameOf = (databaseUrl: string | undefined): string => {
  if (!databaseUrl) throw new Error("No hay DATABASE_URL definida");
  try {
    return decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ""));
  } catch {
    throw new Error("DATABASE_URL no es una URL valida");
  }
};

export const assertTestDatabase = (databaseUrl: string | undefined): void => {
  const name = databaseNameOf(databaseUrl);
  if (!name.toLowerCase().endsWith(TEST_DATABASE_SUFFIX)) {
    // Solo se muestra el nombre de la base, nunca la URL (lleva la contrasena).
    throw new Error(
      `Los tests borran todas las tablas y no se ejecutan contra la base "${name}": su nombre debe terminar en ` +
        `"${TEST_DATABASE_SUFFIX}". Define TEST_DATABASE_URL (en backend/.env) apuntando a una base de pruebas, ` +
        `por ejemplo mymoney_test.`,
    );
  }
};
