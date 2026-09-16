import request from "supertest";
import { createApp } from "../src/app.js";

export const app = createApp();

export async function registerFamily(overrides?: Partial<{
  familyName: string;
  name: string;
  email: string;
  password: string;
}>) {
  const payload = {
    familyName: "Familia Test",
    name: "Ana",
    email: `ana-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
    password: "password123",
    ...overrides,
  };

  const res = await request(app).post("/api/auth/register-family").send(payload);
  return { res, payload };
}
