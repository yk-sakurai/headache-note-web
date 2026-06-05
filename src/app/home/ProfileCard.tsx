"use client";

export default function ProfileCard({
  email,
  createdDateLabel,
}: {
  email: string;
  createdDateLabel: string | null;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-600">メールアドレス</p>
          <p className="text-base font-medium break-all">{email || "-"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-600">登録日</p>
          <p className="text-base font-medium">{createdDateLabel ?? "-"}</p>
        </div>
      </div>
    </div>
  );
}
