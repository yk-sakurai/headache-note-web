export default function Home() {
  const features = [
    {
      title: "強さを記録",
      description: "痛みの強さや部位を、かんたんに記録。その日の状態をすぐに残せます。",
      icon: "chart",
    },
    {
      title: "薬と対処を残す",
      description: "飲んだ薬や、試した対処法、メモをまとめて記録できます。",
      icon: "pill",
    },
    {
      title: "あとで振り返る",
      description: "日々の記録をグラフやカレンダーで確認。受診時にも役立ちます。",
      icon: "calendar",
    },
  ];

  const faqs = [
    {
      question: "記録はあとから編集できますか？",
      answer: "はい。日々の記録はあとから見直して、内容を編集できます。",
    },
    {
      question: "薬を飲まなかった日も残せますか？",
      answer: "はい。服薬なしの記録も残せます。お好みの記録項目を選んで、必要な情報だけを記録できます。",
    },
    {
      question: "無料で使えますか？",
      answer: "はい。基本的な機能は無料でご利用できます。",
    },
  ];

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#F1FBF7] text-[#17211D]">
      <div className="mx-auto box-border flex w-full max-w-7xl flex-col px-5 pb-8 pt-8 sm:px-8 md:pb-10 md:pt-12 lg:px-10">
        <section className="grid max-w-xs items-center gap-7 sm:max-w-none md:grid-cols-[0.78fr_1.22fr] md:gap-8 lg:gap-12">
          <div className="animate-calm-fade-in relative flex min-w-0 flex-col gap-5 md:gap-7">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-[#008F6D]">頭痛ノート</p>
              <h1 className="text-balance text-[2.55rem] font-semibold leading-[1.35] text-[#10231E] sm:text-5xl md:text-[3.25rem] lg:text-[4rem]">
                頭痛の記録を、
                <br />
                あとから見返し
                <br className="sm:hidden" />
                やすく。
              </h1>
              <p className="max-w-xl text-pretty text-lg leading-8 text-[#50615B] md:text-xl">
                痛みの強さ、服薬、メモなどをかんたんに残せます。
              </p>
            </div>

            <div className="relative z-10 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center md:pt-0">
              <a
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#00A67E] px-7 text-base font-semibold text-white shadow-[0_8px_20px_rgba(0,166,126,0.18)] transition hover:bg-[#008F6D] focus:outline-none focus:ring-2 focus:ring-[#00A67E] focus:ring-offset-2"
              >
                ユーザー登録
              </a>
            </div>

            <div className="grid gap-3 text-sm text-[#50615B] sm:grid-cols-3 md:max-w-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#CFE8DF] bg-white text-[#008F6D]">
                  <ListChecksIcon />
                </span>
                <span>記録をあとから見返しやすく</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#CFE8DF] bg-white text-[#008F6D]">
                  <PhoneIcon />
                </span>
                <span>スマホでも読みやすい</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#CFE8DF] bg-white text-[#008F6D]">
                  <PenLineIcon />
                </span>
                <span>今日からすぐ記録</span>
              </div>
            </div>
          </div>

          <RecordPreview />
        </section>

        <section id="features" className="scroll-mt-24 grid gap-4 pt-7 md:grid-cols-3 md:gap-5 md:pt-8">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="animate-calm-fade-in flex items-center gap-5 rounded-lg border border-[#E8F0EC] bg-white p-5 shadow-[0_12px_34px_rgba(23,33,29,0.06)] md:p-6"
            >
              <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-[#E6F8F2] text-[#008F6D] md:size-20">
                <FeatureIcon name={feature.icon} />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-[#17211D]">{feature.title}</h2>
                <p className="mt-2 text-sm leading-7 text-[#50615B]">{feature.description}</p>
              </div>
            </article>
          ))}
        </section>

        <section id="faq" className="scroll-mt-24 py-9 md:py-10">
          <div className="grid gap-4 md:grid-cols-[0.72fr_1.28fr] md:gap-8">
            <div>
              <p className="text-sm font-semibold text-[#008F6D]">FAQ</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#17211D] md:text-3xl">よくある質問</h2>
              <p className="mt-3 text-sm leading-7 text-[#50615B]">
                はじめる前に気になりやすい点を、短くまとめました。
              </p>
            </div>
            <div className="grid gap-3">
              {faqs.map((faq) => (
                <article key={faq.question} className="rounded-lg border border-[#E8F0EC] bg-white p-5">
                  <h3 className="text-base font-semibold text-[#17211D]">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#50615B]">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <footer className="bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-[#50615B] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-[#17211D]">頭痛ノート</p>
            <p className="mt-2">© 2026 頭痛ノート</p>
          </div>
          <nav aria-label="フッター" className="flex flex-wrap gap-y-3 md:divide-x md:divide-[#DCE9E4] md:justify-end">
            <a className="pr-6 transition hover:text-[#008F6D] md:px-6 md:pl-0" href="/terms">
              利用規約
            </a>
            <a className="pr-6 transition hover:text-[#008F6D] md:px-6 md:pr-0" href="/privacy">
              プライバシーポリシー
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}

type PreviewCalendarDay = {
  day: string;
  muted?: boolean;
  intensity?: number;
  tone?: "low" | "medium" | "high" | "unknown";
  today?: boolean;
};

const previewCalendarDays: PreviewCalendarDay[] = [
  { day: "31", muted: true },
  { day: "1", intensity: 2, tone: "low" },
  { day: "2" },
  { day: "3", intensity: 5, tone: "medium" },
  { day: "4" },
  { day: "5", intensity: 2, tone: "low" },
  { day: "6" },
  { day: "7", tone: "unknown" },
  { day: "8" },
  { day: "9", intensity: 5, tone: "medium" },
  { day: "10" },
  { day: "11", intensity: 7, tone: "high", today: true },
  { day: "12", intensity: 2, tone: "low" },
  { day: "13" },
  { day: "14", intensity: 5, tone: "medium" },
  { day: "15" },
  { day: "16", tone: "unknown" },
  { day: "17", intensity: 2, tone: "low" },
  { day: "18" },
  { day: "19", intensity: 5, tone: "medium" },
  { day: "20" },
  { day: "21", intensity: 2, tone: "low" },
  { day: "22" },
  { day: "23", tone: "unknown" },
  { day: "24" },
  { day: "25", intensity: 7, tone: "high" },
  { day: "26" },
  { day: "27" },
  { day: "28", tone: "unknown" },
  { day: "29" },
  { day: "30", intensity: 5, tone: "medium" },
  { day: "1", muted: true },
  { day: "2", muted: true },
  { day: "3", muted: true },
  { day: "4", muted: true },
];

const previewWeekdays = ["日", "月", "火", "水", "木", "金", "土"];
const previewStats = [
  { label: "記録", value: "8", unit: "件" },
  { label: "記録日", value: "6", unit: "日" },
  { label: "強さの平均", value: "3.6" },
];
const previewLegend = [
  { label: "1-3", className: "bg-[#E6F8F2] ring-[#CFE8DF]" },
  { label: "4-6", className: "bg-[#00A67E] ring-[#00A67E]" },
  { label: "7-10", className: "bg-[#F59E0B] ring-[#F59E0B]" },
  { label: "強度未入力", className: "bg-[#DCE9E4] ring-[#DCE9E4]" },
];

function previewBadgeClass(tone: PreviewCalendarDay["tone"]) {
  if (tone === "high") {
    return "bg-[#F59E0B] text-white";
  }
  if (tone === "medium") {
    return "bg-[#00A67E] text-white";
  }
  if (tone === "unknown") {
    return "bg-[#DCE9E4] text-[#50615B]";
  }
  return "bg-[#E6F8F2] text-[#007A5D]";
}

function RecordPreview() {
  return (
    <section
      aria-label="記録プレビュー"
      className="animate-calm-fade-in w-full max-w-full overflow-hidden rounded-xl border border-[#DCE9E4] bg-white p-4 shadow-[0_18px_46px_rgba(23,33,29,0.09)] sm:p-5"
    >
      <div className="mb-4 space-y-1">
        <h2 className="text-2xl font-semibold text-[#17211D]">月ごとの記録</h2>
        <p className="text-sm leading-6 text-[#50615B]">
          カレンダーで痛みの強さや記録日を確認できます
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_210px]">
        <div className="min-w-0 rounded-lg border border-[#DCE9E4] bg-white p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[#17211D]">2026年6月</h3>
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-[#DCE9E4] bg-white text-xs font-medium text-[#50615B] sm:text-sm">
              <span className="flex h-8 min-w-7 items-center justify-center px-2 sm:h-9 sm:min-w-9 sm:px-3">←</span>
              <span className="flex h-8 min-w-10 items-center justify-center border-x border-[#DCE9E4] px-2 sm:h-9 sm:min-w-14 sm:px-3">
                今月
              </span>
              <span className="flex h-8 min-w-7 items-center justify-center px-2 sm:h-9 sm:min-w-9 sm:px-3">→</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-[#7A8984] sm:gap-2">
            {previewWeekdays.map((weekday) => (
              <div key={weekday} className="py-1">
                {weekday}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-0.5 sm:gap-2">
            {previewCalendarDays.map((date, index) => (
              <div
                key={`${date.day}-${index}`}
                className={`flex aspect-square min-h-8 flex-col items-center justify-between rounded-lg border p-1 sm:min-h-14 sm:p-2 ${
                  date.today
                    ? "border-[#00A67E]"
                    : "border-[#E8F0EC]"
                } ${date.muted ? "bg-[#F8FAF9] text-[#A6B2AE]" : "bg-white text-[#17211D]"}`}
              >
                <span className="self-start text-[10px] font-medium sm:text-xs">
                  {date.day}
                </span>
                <span className="flex min-h-5 items-center justify-center">
                  {date.tone && (
                    <span
                      className={`inline-flex size-4 items-center justify-center rounded-full text-[9px] font-semibold sm:size-6 sm:text-[11px] ${previewBadgeClass(
                        date.tone
                      )}`}
                    >
                      {date.intensity ?? "?"}
                    </span>
                  )}
                </span>
                <span className="min-h-2" />
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 border-t border-[#E8F0EC] pt-3 text-[11px] text-[#50615B]">
            {previewLegend.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className={`size-3 rounded-full ring-1 ${item.className}`} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-[#DCE9E4] bg-white p-4">
          <h3 className="text-base font-semibold text-[#17211D]">2026年6月の記録</h3>
          <p className="mt-2 text-xs leading-5 text-[#50615B]">
            この月に記録した日数や、痛みの強さの平均を確認できます。
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-1">
            {previewStats.map((stat) => (
              <div key={stat.label} className="rounded-lg bg-[#F8FAF9] p-3">
                <p className="text-[11px] text-[#7A8984]">{stat.label}</p>
                <p className="mt-1 text-xl font-semibold text-[#17211D]">
                  {stat.value}
                  {stat.unit && (
                    <span className="ml-0.5 text-xs font-medium text-[#50615B]">
                      {stat.unit}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#00A67E] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,166,126,0.16)] transition hover:bg-[#008F6D] focus:outline-none focus:ring-2 focus:ring-[#00A67E] focus:ring-offset-2"
          >
            + 新しく記録する
          </button>
        </aside>
      </div>
    </section>
  );
}

function FeatureIcon({ name }: { name: string }) {
  if (name === "pill") {
    return (
      <svg aria-hidden="true" className="size-9" fill="none" viewBox="0 0 36 36">
        <path d="M13.5 24.5 24.5 13.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
        <rect height="23" rx="7" stroke="currentColor" strokeWidth="2.4" transform="rotate(45 18 18)" width="13" x="11.5" y="6.5" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg aria-hidden="true" className="size-9" fill="none" viewBox="0 0 36 36">
        <rect height="24" rx="4" stroke="currentColor" strokeWidth="2.4" width="26" x="5" y="7" />
        <path d="M11 5v6M25 5v6M6 15h24M12 24l4 4 8-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-9" fill="none" viewBox="0 0 36 36">
      <path d="M8 28V17M18 28V9M28 28V13" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

function ListChecksIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="m4 7 2 2 3-4M4 17l2 2 3-4M13 7h7M13 17h7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <rect height="18" rx="2" stroke="currentColor" strokeWidth="2" width="12" x="6" y="3" />
      <path d="M10 17h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function PenLineIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
