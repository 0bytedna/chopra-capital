"use client";

import { useEffect, useRef, useState } from "react";

type AdjustmentType =
  | "TRADING_PROFIT"
  | "TRADING_LOSS"
  | "SERVER_FEE"
  | "ADMIN_SHARE"
  | "OTHER_INCREASE"
  | "OTHER_DECREASE";

const options: { value: AdjustmentType; label: string }[] = [
  { value: "TRADING_PROFIT", label: "Trading profit" },
  { value: "TRADING_LOSS", label: "Trading loss" },
  { value: "SERVER_FEE", label: "Server or operating fee" },
  { value: "ADMIN_SHARE", label: "Company's profit share" },
  { value: "OTHER_INCREASE", label: "Other increase" },
  { value: "OTHER_DECREASE", label: "Other decrease" },
];

const decreaseTypes = new Set<AdjustmentType>([
  "TRADING_LOSS",
  "SERVER_FEE",
  "ADMIN_SHARE",
  "OTHER_DECREASE",
]);

const inputClass =
  "h-10 w-full rounded-lg border border-gold-600/20 bg-vault-950/65 px-3 text-sm text-ink placeholder:text-ink-faint";

function numberValue(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: number): string {
  return value.toFixed(2);
}

export function TradingAdjustmentFields({ currentBalance }: { currentBalance: number }) {
  const [type, setType] = useState<AdjustmentType>("TRADING_PROFIT");
  const [amount, setAmount] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [lastEdited, setLastEdited] = useState<"amount" | "balance">("amount");
  const newBalanceRef = useRef<HTMLInputElement>(null);

  const target = numberValue(newBalance);
  const difference = target === null ? null : target - currentBalance;
  const expectsDecrease = decreaseTypes.has(type);
  const directionMismatch =
    difference !== null &&
    difference !== 0 &&
    ((difference < 0) !== expectsDecrease);
  const directionMessage = directionMismatch
    ? expectsDecrease
      ? "This reason decreases the balance. Enter a new balance below the current balance."
      : "This reason increases the balance. Enter a new balance above the current balance."
    : difference === 0 && newBalance
      ? "New balance must be different from the current balance."
      : "";

  useEffect(() => {
    newBalanceRef.current?.setCustomValidity(directionMessage);
  }, [directionMessage]);

  function calculateBalance(nextAmount: string, nextType = type) {
    const parsed = numberValue(nextAmount);
    if (parsed === null) {
      setNewBalance("");
      return;
    }
    const signed = decreaseTypes.has(nextType) ? -parsed : parsed;
    setNewBalance(money(currentBalance + signed));
  }

  function calculateAmount(nextBalance: string) {
    const parsed = numberValue(nextBalance);
    if (parsed === null) {
      setAmount("");
      return;
    }
    setAmount(money(Math.abs(parsed - currentBalance)));
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="space-y-1.5 text-xs text-ink-faint">
        Reason
        <select
          name="type"
          value={type}
          required
          onChange={(event) => {
            const nextType = event.currentTarget.value as AdjustmentType;
            setType(nextType);
            if (lastEdited === "amount") calculateBalance(amount, nextType);
          }}
          className={inputClass}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5 text-xs text-ink-faint">
        Amount (USD)
        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={amount}
          onChange={(event) => {
            const nextAmount = event.currentTarget.value;
            setLastEdited("amount");
            setAmount(nextAmount);
            calculateBalance(nextAmount);
          }}
          placeholder="0.00"
          className={inputClass}
        />
      </label>

      <label className="space-y-1.5 text-xs text-ink-faint">
        New balance (USD)
        <input
          ref={newBalanceRef}
          name="newBalance"
          type="number"
          min="0"
          step="0.01"
          value={newBalance}
          onChange={(event) => {
            const nextBalance = event.currentTarget.value;
            setLastEdited("balance");
            setNewBalance(nextBalance);
            calculateAmount(nextBalance);
          }}
          placeholder={money(currentBalance)}
          className={inputClass}
          aria-describedby={directionMessage ? "new-balance-error" : undefined}
          aria-invalid={Boolean(directionMessage)}
        />
        {directionMessage && (
          <span id="new-balance-error" className="block text-xs text-negative">
            {directionMessage}
          </span>
        )}
      </label>
    </div>
  );
}
