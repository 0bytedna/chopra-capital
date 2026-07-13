import { z } from "zod";
import { NETWORKS } from "@/lib/config";

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const signinSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z.string().min(1, "Please enter your password"),
});

export const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
});

export const depositSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  network: z.enum(NETWORKS),
  txHash: z.string().trim().max(200).optional().or(z.literal("")),
});

export const withdrawSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  network: z.enum(NETWORKS),
  address: z.string().trim().min(15, "Enter a valid wallet address").max(120),
});

export const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Please give the ticket a subject").max(150),
  body: z.string().trim().min(5, "Please describe the issue").max(5000),
});

export const replySchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(5000),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(100),
  mobile: z.string().trim().max(30).optional().or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(200),
});
