"use client";

import type { Invoice } from "@/lib/firestore/types";

type SerializedInvoice = Omit<Invoice, 'createdAt'> & {
  createdAt: string | null;
};

export default function InvoiceList({ invoices }: { invoices: SerializedInvoice[] }) {
  if (!invoices || invoices.length === 0) {
    return (
      <div className="border rounded-lg p-4 text-sm text-gray-600">
        請求履歴はありません。
      </div>
    );
  }

  const formatAmount = (amount: number, currency: string) => {
    const unit = currency.toUpperCase();
    const isZeroDecimal = unit === "JPY";
    const value = isZeroDecimal ? amount : amount / 100;
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: unit,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(value);
  };

  const toDateLabel = (dateValue: string | null | undefined): string => {
    try {
      if (!dateValue) return "-";
      if (typeof dateValue === "string") {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      }
    } catch (_) {}
    return "-";
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">請求日</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">金額</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">ステータス</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">リンク</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invoices.map((inv) => (
            <tr key={inv.stripeInvoiceId} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm">{toDateLabel(inv.createdAt)}</td>
              <td className="px-4 py-2 text-sm">{formatAmount(inv.amountPaid || inv.amountDue || 0, inv.currency || "JPY")}</td>
              <td className="px-4 py-2 text-sm">
                {inv.status === "paid" ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">支払い済み</span>
                ) : inv.status === "open" ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">未決済</span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">{inv.status}</span>
                )}
              </td>
              <td className="px-4 py-2 text-sm space-x-2">
                {inv.hostedInvoiceUrl ? (
                  <a className="text-blue-600 hover:underline" href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer">ページ</a>
                ) : null}
                {inv.invoicePdf ? (
                  <a className="text-blue-600 hover:underline" href={inv.invoicePdf} target="_blank" rel="noreferrer">PDF</a>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
