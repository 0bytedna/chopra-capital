import "server-only";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { APP_NAME } from "@/lib/config";

export function generateTotpSecret(): string {
  return generateSecret();
}

export async function totpEnrolmentQr(email: string, secret: string): Promise<string> {
  const uri = generateURI({ issuer: APP_NAME, label: email, secret });
  return QRCode.toDataURL(uri, { margin: 1, width: 220 });
}

export async function verifyTotp(code: string, secret: string): Promise<boolean> {
  try {
    // ±30s tolerance absorbs small clock drift between phone and server.
    const result = await verify({
      secret,
      token: code.replace(/\s/g, ""),
      epochTolerance: 30,
    });
    return result.valid;
  } catch {
    return false;
  }
}
