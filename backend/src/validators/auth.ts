import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerFamilySchema = z.object({
  familyName: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const inviteMemberSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});
