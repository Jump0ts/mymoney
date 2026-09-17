import request from "supertest";
import { createApp } from "../src/app.js";

export const app = createApp();

export async function registerUser(overrides?: Partial<{
  name: string;
  email: string;
  password: string;
}>) {
  const payload = {
    name: "Ana",
    email: `ana-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
    password: "password123",
    ...overrides,
  };

  const res = await request(app).post("/api/auth/register").send(payload);
  return { res, payload };
}
