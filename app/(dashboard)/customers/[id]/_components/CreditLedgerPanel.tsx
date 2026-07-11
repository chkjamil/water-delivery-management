"use client";

import { useState, useTransition } from "react";
import { Wallet, Check } from "lucide-react";
import { recordCreditPayment } from "../../actions";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface TransactionRow {
  id: string;
  type: "accrual" | "payment";
  amount: number;
  note: string | null;
  created_at: string;
}

export default function CreditLedgerPanel({
  customerId, creditBalance, initialTransactions,
}: { customerId: string; creditBalance: number; initialTransactions: TransactionRow[] }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [amount, setAmount]             = useState("");
  const [isPending, start]              = useTransition();

  function handleSettle() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    start(async () => {
      const result = await recordCreditPayment(customerId, amt, "Balance settled by admin");
      if (result.error) { toast.error(result.error); return; }
      setTransactions((prev) => [
        { id: crypto.randomUUID(), type: "payment", amount: amt, note: "Balance settled by admin", created_at: new Date().toISOString() },
        ...prev,
      ]);
      setAmount("");
      toast.success("Payment recorded");
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
          <Wallet size={15} className="text-brand-600" /> Credit Balance
        </h2>
        <span className={`badge text-xs ${creditBalance > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          PKR {creditBalance.toLocaleString()}
        </span>
      </div>
      <div className="card-body space-y-3">
        {creditBalance > 0 && (
          <div className="flex gap-2">
            <input type="number" min="0" step="1" className="input flex-1" placeholder="Amount received"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button onClick={handleSettle} className="btn-primary btn-sm" disabled={isPending}>
              <Check size={14} /> {isPending ? "Saving…" : "Record Payment"}
            </button>
          </div>
        )}
        {transactions.length > 0 ? (
          <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
            {transactions.map((t) => (
              <div key={t.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <span className={t.type === "accrual" ? "text-red-600" : "text-green-600"}>
                    {t.type === "accrual" ? "+ " : "− "}PKR {t.amount.toLocaleString()}
                  </span>
                  {t.note && <span className="text-xs text-slate-400 ml-2">{t.note}</span>}
                </div>
                <span className="text-xs text-slate-400">{format(new Date(t.created_at), "MMM d, yyyy")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No credit transactions yet</p>
        )}
      </div>
    </div>
  );
}
