export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const checkout = params.checkout;

  return (
    <div className="min-h-screen">
      <div className="max-w-screen-lg mx-auto px-4 py-12">
        {checkout === 'success' && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
            <p className="text-green-800">
              ご登録ありがとうございます！ご利用を開始できます。
            </p>
          </div>
        )}
        <div className="flex items-center justify-center min-h-[50vh]">
          <h1 className="text-2xl font-semibold">ホーム画面</h1>
        </div>
      </div>
    </div>
  );
}
