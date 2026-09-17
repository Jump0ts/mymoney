import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../utils/errors.js";
import { verifyAuthToken } from "../modules/auth/auth.utils.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
      };
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw unauthorized();
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAuthToken(token);
    req.auth = { userId: payload.userId };
    next();
  } catch {
    throw unauthorized("Token inválido o caducado");
  }
};
