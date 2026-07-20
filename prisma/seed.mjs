// Dev seed: one admin + one demo investor with a small, internally-consistent
// history (deposit → invest → NAV drift → one processed withdrawal) so every
// dashboard widget has something real to show. Run: npm run db:seed
//
// Sign-in credentials it creates:
//   admin@chopracapital.com / Admin123!
//   demo@chopracapital.com  / Demo1234!

import { PrismaClient } from "../src/generated/prisma/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAY = 86_400_000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const dayKey = (d) => d.toISOString().slice(0, 10);

const DEMO_PROFILE = {
  fullName: "Demo Investor",
  mobile: "+91 98765 43210",
  country: "India",
  address: "101 Demo Residency, MG Road",
  city: "Mumbai",
  state: "Maharashtra",
};

const DEMO_BANKING = {
  accountNumber: "00001234567890",
  ifsc: "SBIN0001234",
  upiId: "demo@upi",
  accountType: "SAVINGS",
  usdtAddress: "TDemoInvestorPayoutAddress0000000000",
  usdtNetwork: "TRC20",
};

// Deterministic gentle NAV path over the last 28 days (≈ +1.9% overall, with
// flat and down days included — honest demo data, not a fantasy curve).
const NAV_DELTAS = [
  0.0011, 0.0008, -0.0004, 0.0013, 0.0006, 0.0, 0.0, 0.0009, -0.0007, 0.0012,
  0.0005, 0.001, -0.0003, 0.0, 0.0, 0.0008, 0.0011, -0.0009, 0.0007, 0.0013,
  0.0004, 0.0, 0.0, 0.001, 0.0006, -0.0005, 0.0012, 0.0009,
];

async function main() {
  console.log("Seeding…");

  // --- Users ---------------------------------------------------------------
  const adminHash = await bcrypt.hash("Admin123!", 12);
  const demoHash = await bcrypt.hash("Demo1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@chopracapital.com" },
    update: {},
    create: {
      email: "admin@chopracapital.com",
      passwordHash: adminHash,
      role: "ADMIN",
      fullName: "Operations Desk",
      kycStatus: "APPROVED",
      wallet: { create: {} },
    },
  });

  const existingDemo = await prisma.user.findUnique({ where: { email: "demo@chopracapital.com" } });
  if (existingDemo) {
    // Ensure the demo investor can exercise every local funding flow.
    await prisma.user.update({
      where: { id: existingDemo.id },
      data: {
        ...DEMO_PROFILE,
        kycStatus: "APPROVED",
        bankTransferEnabled: true,
        cashEnabled: true,
      },
    });
    await prisma.bankingDetail.upsert({
      where: { userId: existingDemo.id },
      create: { userId: existingDemo.id, ...DEMO_BANKING },
      update: DEMO_BANKING,
    });
    console.log("Demo investor already exists — refreshed its test profile and payout details.");
    return;
  }

  const demo = await prisma.user.create({
    data: {
      email: "demo@chopracapital.com",
      passwordHash: demoHash,
      role: "USER",
      ...DEMO_PROFILE,
      kycStatus: "APPROVED",
      bankTransferEnabled: true,
      cashEnabled: true,
      wallet: { create: {} },
      bankingDetail: { create: DEMO_BANKING },
    },
  });

  // --- History -------------------------------------------------------------
  const depositAmount = 10_000;
  const investDay = 28;

  // Deposit (confirmed) 35 days ago
  const deposit = await prisma.deposit.create({
    data: {
      userId: demo.id,
      amount: depositAmount,
      reportedUsdtAmount: depositAmount,
      network: "TRC20",
      txHash: "demo-seed-tx-0001",
      status: "CONFIRMED",
      adminNote: "Seed data",
      createdAt: daysAgo(35),
      receivedAt: daysAgo(34),
      confirmedAt: daysAgo(34),
    },
  });
  await prisma.ledgerEntry.create({
    data: {
      userId: demo.id,
      type: "DEPOSIT",
      amount: depositAmount,
      reference: deposit.id,
      note: "Deposit confirmed (TRC20)",
      createdAt: daysAgo(34),
    },
  });

  // Invest run 28 days ago at NAV 1.0 → 10,000 units
  let units = depositAmount;
  await prisma.ledgerEntry.create({
    data: {
      userId: demo.id,
      type: "INVEST",
      amount: depositAmount,
      units,
      navPrice: 1,
      note: "Weekly invest run",
      createdAt: daysAgo(investDay),
    },
  });

  // Daily NAV snapshots from invest day to today
  let nav = 1;
  let totalUnits = units;
  const navByDaysAgo = new Map();
  for (let i = investDay; i >= 0; i--) {
    nav += NAV_DELTAS[investDay - i] ?? 0;
    navByDaysAgo.set(i, nav);
    // (snapshot rows are created below, after the withdrawal adjusts units)
  }

  // One processed withdrawal 7 days ago: 500 USDT gross, 1 USDT fee
  const wdDaysAgo = 7;
  const wdNav = navByDaysAgo.get(wdDaysAgo);
  const gross = 500;
  const fee = 1;
  const payout = gross - fee;
  const unitsRedeemed = gross / wdNav;

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId: demo.id,
      amount: gross,
      fee,
      brokerReceivedUsdt: payout,
      paidAmount: payout,
      unitsRedeemed,
      network: "TRC20",
      address: DEMO_BANKING.usdtAddress,
      txHash: "demo-seed-tx-0002",
      status: "PROCESSED",
      weekKey: "seed",
      createdAt: daysAgo(wdDaysAgo + 1),
      approvedAt: daysAgo(wdDaysAgo + 1),
      brokerReceivedAt: daysAgo(wdDaysAgo),
      processedAt: daysAgo(wdDaysAgo),
    },
  });
  await prisma.ledgerEntry.create({
    data: {
      userId: demo.id,
      type: "FEE",
      amount: -fee,
      units: -(fee / wdNav),
      navPrice: wdNav,
      reference: withdrawal.id,
      note: "Withdrawal fee",
      createdAt: daysAgo(wdDaysAgo),
    },
  });
  await prisma.ledgerEntry.create({
    data: {
      userId: demo.id,
      type: "WITHDRAWAL",
      amount: -payout,
      units: -(payout / wdNav),
      navPrice: wdNav,
      reference: withdrawal.id,
      note: "Withdrawal paid (TRC20)",
      createdAt: daysAgo(wdDaysAgo),
    },
  });

  units -= unitsRedeemed;
  totalUnits = units;

  // Snapshots: pool units change on the withdrawal day
  for (let i = investDay; i >= 0; i--) {
    const dayNav = navByDaysAgo.get(i);
    const dayUnits = i > wdDaysAgo ? depositAmount : totalUnits;
    await prisma.navSnapshot.create({
      data: {
        day: dayKey(daysAgo(i)),
        nav: dayNav,
        equity: dayNav * dayUnits,
        totalUnits: dayUnits,
        createdAt: daysAgo(i),
      },
    });
  }

  // --- Wallet, pool, MT5 account -------------------------------------------
  await prisma.wallet.update({
    where: { userId: demo.id },
    data: { queued: 0, units },
  });
  await prisma.poolState.upsert({
    where: { id: "pool" },
    update: { totalUnits, lastNav: nav },
    create: { id: "pool", totalUnits, lastNav: nav },
  });
  await prisma.mt5Account.upsert({
    where: { login: process.env.MT5_LOGIN ?? "000000" },
    update: { equity: nav * totalUnits, balance: nav * totalUnits },
    create: {
      login: process.env.MT5_LOGIN ?? "000000",
      name: "Chopra Capital Pool",
      server: process.env.MT5_SERVER ?? "ChopraCapital-Live",
      currency: "USD",
      balance: nav * totalUnits,
      equity: nav * totalUnits,
    },
  });
  await prisma.setting.upsert({
    where: { key: "INVEST_FEE_PERCENT" },
    update: {},
    create: { key: "INVEST_FEE_PERCENT", value: "0" },
  });

  // A welcome ticket so the support UI has content
  await prisma.ticket.create({
    data: {
      userId: demo.id,
      subject: "Welcome to Chopra Capital",
      status: "ANSWERED",
      createdAt: daysAgo(30),
      messages: {
        create: [
          {
            authorId: demo.id,
            isStaff: false,
            body: "Hi — how do I watch the trading account live?",
            createdAt: daysAgo(30),
          },
          {
            authorId: admin.id,
            isStaff: true,
            body: "Welcome! Open your dashboard and find the “Watch the account live” card — it has the read-only MT5 investor login and a link to the web terminal. You can watch every position in real time.",
            createdAt: daysAgo(30),
          },
        ],
      },
    },
  });

  console.log("Seeded.");
  console.log("  admin@chopracapital.com / Admin123!");
  console.log("  demo@chopracapital.com  / Demo1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
