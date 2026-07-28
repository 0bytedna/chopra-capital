import { requireUser } from "@/lib/auth";
import { getPortfolioMetrics } from "@/lib/portfolio";
import { formatUsdt, toNumber } from "@/lib/money";
import { getUserNotificationCenter } from "@/lib/userNotifications";
import { AppShell } from "@/components/app/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [metrics, notifications] = await Promise.all([
    getPortfolioMetrics(user.id),
    getUserNotificationCenter(user.id),
  ]);

  const invested = toNumber(metrics.units.mul(metrics.nav));

  return (
    <AppShell
      name={user.fullName ?? "Investor"}
      email={user.email}
      isAdmin={user.role === "ADMIN"}
      kycStatus={user.kycStatus}
      investedDisplay={`${formatUsdt(invested)} USD`}
      queuedDisplay={`${formatUsdt(metrics.queued)} USD`}
      attentionCount={notifications.attentionCount}
    >
      {children}
    </AppShell>
  );
}
