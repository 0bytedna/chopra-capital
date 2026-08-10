import type { Metadata } from "next";

export const metadata: Metadata = { title: "Risk disclosure" };

export default function RiskPage() {
  return (
    <>
      <p className="eyebrow">Legal</p>
      <h1>Risk disclosure</h1>
      <p className="lead">
        Please read this carefully before investing. It is deliberately written in plain language.
      </p>

      <h2>Your capital is at risk</h2>
      <p>
        The value of your investment can go down as well as up. You may receive back less than you
        deposited, and in adverse scenarios you could lose your entire investment. Nothing on this
        platform is a guarantee of any return.
      </p>

      <h2>Performance objectives are not promises</h2>
      <p>
        Where we state a performance objective — such as a target of 1–3% per month — this
        describes what the strategy is designed to pursue, not what it will achieve. Actual
        results will vary. Some periods will be flat and some may be negative. Past performance,
        where shown, is not a reliable indicator of future results.
      </p>

      <h2>Hedging does not eliminate risk</h2>
      <p>
        The strategy holds spot gold positions hedged with gold futures with the aim of being
        market-neutral. Hedging materially reduces directional exposure, but meaningful risks
        remain, including:
      </p>
      <ul>
        <li>Basis risk — spot and futures prices do not always move in lockstep.</li>
        <li>Execution and slippage risk, particularly in fast or illiquid markets.</li>
        <li>Liquidity risk — positions may not always be adjustable at desired prices.</li>
        <li>Counterparty and broker risk, including the failure of an exchange or broker.</li>
        <li>Operational and technology risk, including software faults in automated systems.</li>
      </ul>

      <h2>Automated trading</h2>
      <p>
        Orders are executed by automated systems under human supervision. Automated systems can
        malfunction, behave unexpectedly in unusual market conditions, or be affected by outages
        of brokers, data feeds or infrastructure. Human supervision reduces, but cannot remove,
        these risks.
      </p>

      <h2>Digital-asset transfer risk</h2>
      <p>
        Deposits and withdrawals are made in USDT on public blockchains. Blockchain transfers are
        irreversible. Sending funds to a wrong address or on a wrong network can result in
        permanent loss. Stablecoins also carry their own issuer and de-pegging risks that are
        outside our control.
      </p>

      <h2>Liquidity and scheduling</h2>
      <p>
        Withdrawals follow a weekly cycle: requests during the configured window shown in the investor portal, with processing on Monday. While there
        is no lock-in, your funds are not available instantly at all times, and processing values
        depend on the NAV at the time of settlement.
      </p>

      <h2>No advice</h2>
      <p>
        Nothing on this platform constitutes investment, legal or tax advice. You are responsible
        for deciding whether this investment is appropriate for your circumstances, and should
        seek independent professional advice if unsure. Only invest money you can afford to lose.
      </p>
    </>
  );
}
