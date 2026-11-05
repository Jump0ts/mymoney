// Un color propio guardado por el usuario (privado de su cuenta).
export interface SavedColor {
  id: string;
  // #RRGGBB en mayusculas.
  hex: string;
  createdAt: string;
}
