import "server-only";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { APP_NAME } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { authRateLimit } from "@/lib/rateLimit";

export function generateTotpSecret(): string {
  return generateSecret();
}

export async function totpEnrolmentQr(email: string, secret: string): Promise<string> {
  const uri = generateURI({ issuer: APP_NAME, label: email, secret });
  return QRCode.toDataURL(uri, { margin: 1, width: 220 });
}

export async function verifyTotpOnce(userId: string, code: string, secret: string): Promise<boolean> {
  const retryAfter = await authRateLimit("totp", userId, 8, 10 * 60_000, { subjectOnly: true });
  if (retryAfter !== null) return false;

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { lastTotpStep: true } });
      if (!user) return false;

      // Accept the current or immediately previous period for small phone clock
      // drift, but never a future code and never an already-consumed time step.
      const result = await verify({
        secret,
        token: code.replace(/\s/g, ""),
        epochTolerance: [30, 0],
        ...(user.lastTotpStep === null ? {} : { afterTimeStep: user.lastTotpStep }),
      });
      if (!result.valid || !("timeStep" in result)) return false;

      const consumed = await tx.user.updateMany({
        where: { id: userId, lastTotpStep: user.lastTotpStep },
        data: { lastTotpStep: result.timeStep },
      });
      return consumed.count === 1;
    });
  } catch {
    return false;
  }
}
