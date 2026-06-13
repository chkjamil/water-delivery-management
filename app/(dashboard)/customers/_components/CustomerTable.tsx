"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { ShieldCheck, ShieldX, UserCheck, UserX, Mail, Phone } from "lucide-react";
import VerificationBadge from "@/components/ui/VerificationBadge";
import { toggleCustomerActive, markPhoneVerified } from "../actions";
import toast from "react-hot-toast";
import Link from "next/link";
import { clsx } from "clsx";

export type CustomerRow = {
  id:             string;
  full_name:      string;
  email:          string;
  phone:          string | null;
  is_active:      boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at:     string;
  credit_balance: number;
  total_spent:    number;
};

interface Props {
  customers: CustomerRow[];
  onRefresh: () => void;
}

export default function CustomerTable({ customers, onRefresh }: Props) {
  const [isPending, start] = useTransition();

  function handleToggleActive(customer: CustomerRow) {
    const action = customer.is_active ? "deactivate" : "activate";
    if (customer.is_active && !confirm(`Deactivate ${customer.full_name}? They won't be able to log in.`)) return;
    start(async () => {
      const result = await toggleCustomerActive(customer.id, !customer.is_active);
      if (result.error) { toast.error(result.error); return; }
      toast.success(`Customer ${action}d`);
      onRefresh();
    });
  }

  function handleMarkPhoneVerified(customer: CustomerRow) {
    start(async () => {
      const result = await markPhoneVerified(customer.id);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Phone marked as verified");
      onRefresh();
    });
  }

  if (customers.length === 0) {
    return (
      <div className="card p-12 text-center text-slate-400">
        <UserCheck size={40} className="mx-auto mb-3 text-slate-300" />
        <p className="font-medium">No customers yet</p>
        <p className="text-sm mt-1">Add a customer or wait for self-registrations.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="card hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Verification</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Spent</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className={clsx("hover:bg-slate-50 transition-colors", !c.is_active && "opacity-50 bg-slate-50")}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 text-brand-700 font-bold text-sm">
                        {c.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/customers/${c.id}`} className="font-semibold text-slate-800 hover:text-brand-600 transition-colors">
                          {c.full_name}
                        </Link>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail size={10} />{c.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {c.phone ? (
                      <span className="text-xs text-slate-600 flex items-center gap-1">
                        <Phone size={11} />{c.phone}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <VerificationBadge type="email" verified={c.email_verified} />
                      <VerificationBadge
                        type="phone"
                        verified={c.phone_verified}
                        hasValue={!!c.phone}
                        onVerify={c.phone && !c.phone_verified ? () => handleMarkPhoneVerified(c) : undefined}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {c.credit_balance > 0 ? (
                      <span className="text-red-600 font-semibold text-sm">PKR {c.credit_balance.toLocaleString()}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-medium text-slate-700">
                    PKR {c.total_spent.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">
                    {format(new Date(c.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/customers/${c.id}`} className="btn-ghost btn-sm p-1.5 text-xs">
                        View
                      </Link>
                      <button
                        onClick={() => handleToggleActive(c)}
                        disabled={isPending}
                        title={c.is_active ? "Deactivate" : "Activate"}
                        className={clsx(
                          "btn-ghost btn-sm p-1.5",
                          c.is_active ? "text-red-400 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
                        )}
                      >
                        {c.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {customers.map((c) => (
          <div key={c.id} className={clsx("card p-4", !c.is_active && "opacity-60")}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
                  {c.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <Link href={`/customers/${c.id}`} className="font-semibold text-slate-800 text-sm">
                    {c.full_name}
                  </Link>
                  <p className="text-xs text-slate-400">{c.email}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {c.phone_verified
                  ? <ShieldCheck size={16} className="text-green-500" />
                  : <ShieldX size={16} className="text-amber-400" />
                }
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
              <div><p className="text-slate-400">Phone</p><p>{c.phone ?? "—"}</p></div>
              <div><p className="text-slate-400">Balance</p>
                <p className={c.credit_balance > 0 ? "text-red-600 font-semibold" : ""}>
                  {c.credit_balance > 0 ? `PKR ${c.credit_balance.toLocaleString()}` : "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/customers/${c.id}`} className="btn-secondary btn-sm flex-1 text-center">View Profile</Link>
              <button onClick={() => handleToggleActive(c)} disabled={isPending}
                className={clsx("btn-sm px-3", c.is_active ? "text-red-500" : "text-green-600")}>
                {c.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
