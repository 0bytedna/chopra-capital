import { z } from "zod";
import { NETWORKS } from "@/lib/config";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Password must be 72 bytes or less",
  );

const boundedPasswordInput = z.string().refine(
  (value) => new TextEncoder().encode(value).length <= 72,
  "Password must be 72 bytes or less",
);

const amountSchema = z.coerce
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,6})?$/, "Enter a plain decimal amount with up to 6 decimal places")
  .transform(Number)
  .refine((value) => Number.isFinite(value) && value > 0, "Enter an amount greater than zero")
  .refine((value) => value <= 1_000_000_000, "Amount is above the supported limit");

function decimalPlaces(value: number): number {
  return String(value).split(".")[1]?.length ?? 0;
}

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: passwordSchema,
});

export const signinSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: boundedPasswordInput.min(1, "Please enter your password"),
});

export const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
});

export const depositSchema = z
  .object({
    amount: amountSchema,
    method: z.enum(["CRYPTO", "BANK", "CASH"]).default("CRYPTO"),
    network: z.string().trim().max(20).optional().or(z.literal("")),
    txHash: z.string().trim().max(200).optional().or(z.literal("")),
    reference: z.string().trim().max(100).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.method === "CRYPTO" && !(NETWORKS as readonly string[]).includes(data.network ?? "")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["network"], message: "Choose a USDT network" });
    }
    if (data.method === "CRYPTO" && !data.txHash?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["txHash"], message: "Enter the transaction hash" });
    }
    if (data.method === "CRYPTO" && data.txHash) {
      const validHash =
        data.network === "TRC20"
          ? /^[a-fA-F0-9]{64}$/.test(data.txHash)
          : /^(?:0x)?[a-fA-F0-9]{64}$/.test(data.txHash);
      if (!validHash) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["txHash"], message: "Enter a valid transaction hash for the selected network" });
      }
    }
    if (data.method !== "CRYPTO" && decimalPlaces(data.amount) > 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "INR amounts can have at most 2 decimal places" });
    }
    if (data.method === "BANK" && !data.reference?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reference"], message: "Enter your UTR number" });
    }
    if (data.method === "BANK" && data.reference && !/^\d+$/.test(data.reference)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reference"], message: "UTR number can contain digits only" });
    }
  });

export const withdrawSchema = z.object({
  amount: amountSchema,
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
});

export const bankingDetailsSchema = z
  .object({
    accountNumber: z
      .string()
      .trim()
      .max(40)
      .refine((value) => !value || value.length >= 6, "Bank account number must be at least 6 characters")
      .refine((value) => !value || /^[A-Za-z0-9-]+$/.test(value), "Bank account number contains unsupported characters")
      .optional()
      .or(z.literal("")),
    ifsc: z
      .string()
      .trim()
      .max(20)
      .refine((value) => !value || /^[A-Za-z0-9]+$/.test(value), "IFSC should be alphanumeric")
      .optional()
      .or(z.literal("")),
    upiId: z
      .string()
      .trim()
      .max(100)
      .refine((value) => !value || /^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/.test(value), "Enter a valid UPI ID")
      .optional()
      .or(z.literal("")),
    accountType: z.enum(["SAVINGS", "CURRENT"]).default("SAVINGS"),
  })
  .superRefine((data, ctx) => {
    const hasAccountNumber = Boolean(data.accountNumber?.trim());
    const hasIfsc = Boolean(data.ifsc?.trim());

    if (hasAccountNumber && !hasIfsc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ifsc"],
        message: "Enter the IFSC code for this bank account",
      });
    }
    if (hasIfsc && !hasAccountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accountNumber"],
        message: "Enter the bank account number for this IFSC code",
      });
    }
  });

export const cryptoWalletSchema = z
  .object({
    usdtAddress: z.string().trim().max(100).optional().or(z.literal("")),
    usdtNetwork: z.enum(["TRC20", "ERC20", "BEP20"]).default("TRC20"),
  })
  .superRefine((data, ctx) => {
    if (!data.usdtAddress) return;
    const valid =
      data.usdtNetwork === "TRC20"
        ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(data.usdtAddress)
        : /^0x[a-fA-F0-9]{40}$/.test(data.usdtAddress);
    if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["usdtAddress"],
        message: `Enter a valid ${data.usdtNetwork} USDT wallet address`,
      });
    }
  });

export const changePasswordSchema = z.object({
  currentPassword: boundedPasswordInput.min(1, "Enter your current password"),
  newPassword: passwordSchema,
});
