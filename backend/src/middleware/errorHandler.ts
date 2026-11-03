import type { NextFunction, Request, Response } from "express";
import { ZodError, flattenError } from "zod";
import { AppError } from "../utils/errors.js";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Petición inválida", details: flattenError(err) });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
};
