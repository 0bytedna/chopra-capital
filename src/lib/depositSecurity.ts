import "server-only";

export function transactionHashFingerprint(network: string, txHash: string): string {
  const normalizedNetwork = network.trim().toLowerCase();
  const normalizedHash = txHash.trim().toLowerCase().replace(/^0x/, "");
  return `${normalizedNetwork}:${normalizedHash}`;
}

export function isDuplicateTransactionHash(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") return false;
  const target = "meta" in error && error.meta && typeof error.meta === "object" && "target" in error.meta
    ? String(error.meta.target)
    : "";
  return target.includes("txHashFingerprint");
}
