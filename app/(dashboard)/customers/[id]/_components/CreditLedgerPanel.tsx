"use client";

import { useState, useTransition } from "react";
import { Wallet, Check, Paperclip } from "lucide-react";
import { recordCreditPayment } from "../../actions";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface TransactionRow {
  id: string;
  type: "accrual" | "payment";
  amount: number;
  note: string | null;
  created_at: string;
  evidence_url?: string | null;
  evidence_pending?: boolean; // just-added, evidence uploaded but signed URL not resolved yet
}

export default function CreditLedgerPanel({
  customerId, creditBalance, initialTransactions,
}: { customerId: string; creditBalance: number; initialTransactions: TransactionRow[] }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [amount, setAmount]             = useState("");
  const [note, setNote]                 = useState("");
  const [evidence, setEvidence]         = useState<File | null>(null);
  const [isPending, start]              = useTransition();

  function handleSettle() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    start(async () => {
      const result = await recordCreditPayment(customerId, amt, note.trim() || undefined, evidence ?? undefined);
      if (result.error) { toast.error(result.error); return; }
      const t = result.transaction;
      setTransactions((prev) => [
        {
          id: t?.id ?? crypto.randomUUID(),
          type: "payment", amount: amt,
          note: t?.note ?? (note.trim() || null),
          created_at: t?.created_at ?? new Date().toISOString(),
          evidence_pending: !!t?.evidence_path,
        },
        ...prev,
      ]);
      setAmount(""); setNote(""); setEvidence(null);
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
          <div className="space-y-2">
            <input type="number" min="0" step="1" className="input" placeholder="Amount received"
              value={amount} onChange={(e) => setAmount(e.target.value)} />
            <textarea className="input text-sm" rows={2} placeholder="Notes (e.g. how it was paid)"
              value={note} onChange={(e) => setNote(e.target.value)} />
            <div>
              <label className="label flex items-center gap-1.5"><Paperclip size={12} /> Evidence (optional — receipt, screenshot)</label>
              <input type="file" accept="image/*,.pdf" className="input text-sm"
                onChange={(e) => setEvidence(e.target.files?.[0] ?? null)} />
              {evidence && <p className="text-xs text-green-600 mt-1">✓ {evidence.name}</p>}
            </div>
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
                  {t.evidence_url && (
                    <a href={t.evidence_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline ml-2 inline-flex items-center gap-0.5">
                      <Paperclip size={11} /> receipt
                    </a>
                  )}
                  {t.evidence_pending && (
                    <span className="text-xs text-slate-400 ml-2 inline-flex items-center gap-0.5">
                      <Paperclip size={11} /> evidence attached
                    </span>
                  )}
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
