import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface AuthTokenPayload {
  userId: string;
}

export const signAuthToken = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: "30d" });

export const verifyAuthToken = (token: string): AuthTokenPayload =>
  jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
