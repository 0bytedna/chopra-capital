import "server-only";

export type Mt5InvestorAccount = {
  brokerName: string;
  server: string;
  accountId: string;
  investorPassword: string;
};

export function mt5InvestorAccount(): Mt5InvestorAccount {
  return {
    brokerName: process.env.MT5_BROKER_NAME?.trim() || "Not configured",
    server: process.env.MT5_SERVER?.trim() || "Not configured",
    accountId: process.env.MT5_ID?.trim() || "Not configured",
    investorPassword:
      process.env.MT5_INVESTOR_PASSWORD?.trim() || "Not configured",
  };
}
