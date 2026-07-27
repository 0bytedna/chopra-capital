import "server-only";

import { D, type Dec } from "@/lib/money";
import { getSettingDecimal } from "@/lib/nav";

export const GIOTTUS_USDT_INR_URL = "https://www.giottus.com/tradeview/USDT-INR";
export const GIOTTUS_USDT_INR_XPATH = '//*[@id="table_2"]/tbody/tr[1]/td[3]';

const DEFAULT_RATE = "85";
const FETCH_TIMEOUT_MS = 3_500;
const BEST_BID_PATTERN = /"topbids"\s*:\s*\[\s*\{[^}]*?"price"\s*:\s*"([0-9,.]+)\s*INR"/;

export type WithdrawalReferenceRateDetails = {
  rate: Dec;
  source: "GIOTTUS" | "MANUAL_FALLBACK";
  fallbackRate: Dec;
};

function parsedGiottusRate(html: string): Dec | null {
  const match = BEST_BID_PATTERN.exec(html);
  if (!match?.[1]) return null;

  try {
    const rate = D(match[1].replaceAll(",", ""));
    return rate.gte(40) && rate.lte(200) ? rate : null;
  } catch {
    return null;
  }
}

async function getGiottusBestBidRate(): Promise<Dec | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(GIOTTUS_USDT_INR_URL, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "ChopraCapital-RateMonitor/1.0",
      },
      next: { revalidate: 60 },
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return parsedGiottusRate(await response.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getWithdrawalReferenceRateDetails(): Promise<WithdrawalReferenceRateDetails> {
  const [savedRate, giottusRate] = await Promise.all([
    getSettingDecimal("WITHDRAWAL_INR_PER_USD", DEFAULT_RATE),
    getGiottusBestBidRate(),
  ]);

  const fallbackRate = savedRate.gt(0) && savedRate.lte(1000) ? savedRate : D(DEFAULT_RATE);
  if (giottusRate) return { rate: giottusRate, source: "GIOTTUS", fallbackRate };
  return { rate: fallbackRate, source: "MANUAL_FALLBACK", fallbackRate };
}

export async function getWithdrawalReferenceRate(): Promise<Dec> {
  return (await getWithdrawalReferenceRateDetails()).rate;
}