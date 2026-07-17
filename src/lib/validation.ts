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

export const depositSchema = z
  .object({
    amount: z.coerce.number().positive("Enter an amount greater than zero"),
    method: z.enum(["CRYPTO", "BANK", "CASH"]).default("CRYPTO"),
    network: z.string().trim().max(20).optional().or(z.literal("")),
    txHash: z.string().trim().max(200).optional().or(z.literal("")),
    reference: z.string().trim().max(100).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.method === "CRYPTO" && !(NETWORKS as readonly string[]).includes(data.network ?? "")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["network"], message: "Choose a USDT network" });
    }
    if (data.method === "BANK" && !data.reference?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reference"], message: "Enter your UTR number" });
    }
    if (data.method === "BANK" && data.reference && !/^\d+$/.test(data.reference)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reference"], message: "UTR number can contain digits only" });
    }
  });

export const withdrawSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  method: z.enum(["CRYPTO", "BANK", "CASH"]),
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
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
});

export const bankingSchema = z.object({
  accountNumber: z.string().trim().max(40).optional().or(z.literal("")),
  ifsc: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]+$/, "IFSC should be alphanumeric")
    .max(20)
    .optional()
    .or(z.literal("")),
  upiId: z.string().trim().max(100).optional().or(z.literal("")),
  accountType: z.enum(["SAVINGS", "CURRENT"]).default("SAVINGS"),
  usdtAddress: z.string().trim().max(100).optional().or(z.literal("")),
  usdtNetwork: z.enum(["TRC20", "ERC20", "BEP20"]).default("TRC20"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(200),
});
