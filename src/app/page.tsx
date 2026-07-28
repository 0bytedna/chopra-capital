import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/landing/Hero";
import { LandingSections } from "@/components/landing/SimpleSections";
import { mt5InvestorAccount } from "@/lib/mt5";

export default function HomePage() {
  const account = mt5InvestorAccount();
  const mt5 = {
    brokerName: account.brokerName,
    server: account.server,
    accountId: account.accountId,
  };

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <LandingSections mt5={mt5} />
      </main>
      <Footer />
    </>
  );
}
