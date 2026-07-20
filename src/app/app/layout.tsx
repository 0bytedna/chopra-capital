import { requireUser } from "@/lib/auth";
import { getPortfolioMetrics } from "@/lib/portfolio";
import { formatUsdt, toNumber } from "@/lib/money";
import { AppShell } from "@/components/app/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const metrics = await getPortfolioMetrics(user.id);

  const invested = toNumber(metrics.units.mul(metrics.nav));

  return (
    <AppShell
      name={user.fullName ?? "Investor"}
      email={user.email}
      isAdmin={user.role === "ADMIN"}
      kycStatus={user.kycStatus}
      investedDisplay={`${formatUsdt(invested)} USD`}
      queuedDisplay={`${formatUsdt(metrics.queued)} USD`}
    >
      {children}
    </AppShell>
  );
}
