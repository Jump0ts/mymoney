export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = (message = "No autenticado") => new AppError(401, message);
export const forbidden = (message = "No autorizado") => new AppError(403, message);
export const notFound = (message = "No encontrado") => new AppError(404, message);
export const badRequest = (message = "Petición inválida") => new AppError(400, message);
