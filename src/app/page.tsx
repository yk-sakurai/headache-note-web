import type { ReactNode } from "react";

export default function Home() {
  const weekRecords = [
    { day: "日", value: 1 },
    { day: "月", value: 3 },
    { day: "火", value: 2 },
    { day: "水", value: 5 },
    { day: "木", value: 4 },
    { day: "金", value: 2 },
    { day: "土", value: 4 },
  ];

  const features = [
    {
      title: "強さを記録",
      description: "0〜10の強さや部位を、かんたんに記録。その日の状態をすぐに残せます。",
      icon: "chart",
    },
    {
      title: "薬と対処を残す",
      description: "服薬した薬や、試した対処法、メモをまとめて記録できます。",
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
      answer: "はい。日々の記録はあとから見直して、内容を整えられます。",
    },
    {
      question: "薬を飲まなかった日も残せますか？",
      answer: "服薬なしの記録も残せます。対処やメモだけの記録にも使えます。",
    },
    {
      question: "スマホでも使いやすいですか？",
      answer: "スマホでも入力しやすいように、短い項目で記録できる構成です。",
    },
  ];

  return (
    <main className="min-h-dvh bg-[#F1FBF7] text-[#17211D]">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-5 pb-8 pt-8 sm:px-8 md:pb-10 md:pt-12 lg:px-10">
        <section className="grid items-center gap-7 md:grid-cols-[0.78fr_1.22fr] md:gap-8 lg:gap-12">
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
                痛みの強さ、薬、対処、メモを落ち着いて残せます。
              </p>
            </div>

            <div className="relative z-10 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center md:pt-0">
              <a
                href="/signup"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#00A67E] px-7 text-base font-semibold text-white shadow-[0_8px_20px_rgba(0,166,126,0.18)] transition hover:bg-[#008F6D] focus:outline-none focus:ring-2 focus:ring-[#00A67E] focus:ring-offset-2"
              >
                ユーザー登録
              </a>
              <a
                href="/pricing"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#00A67E] bg-white/80 px-7 text-base font-semibold text-[#008F6D] transition hover:bg-[#E6F8F2] focus:outline-none focus:ring-2 focus:ring-[#00A67E] focus:ring-offset-2"
              >
                料金を見る
              </a>
            </div>

            <div className="grid gap-3 text-sm text-[#50615B] sm:grid-cols-3 md:max-w-xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#CFE8DF] bg-white text-[#008F6D]">
                  <LockIcon />
                </span>
                <span>データは暗号化して保管</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#CFE8DF] bg-white text-[#008F6D]">
                  <PhoneIcon />
                </span>
                <span>スマホでも見やすい</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#CFE8DF] bg-white text-[#008F6D]">
                  <HeartIcon />
                </span>
                <span>まずは無料でお試し</span>
              </div>
            </div>
          </div>

          <RecordPreview weekRecords={weekRecords} />
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
            <a className="pr-6 transition hover:text-[#008F6D] md:px-6 md:pl-0" href="/privacy">
              プライバシーポリシー
            </a>
            <a className="pr-6 transition hover:text-[#008F6D] md:px-6" href="/terms">
              利用規約
            </a>
            <a className="transition hover:text-[#008F6D] md:px-6 md:pr-0" href="/contact">
              お問い合わせ
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function RecordPreview({ weekRecords }: { weekRecords: { day: string; value: number }[] }) {
  return (
    <section
      aria-label="記録プレビュー"
      className="animate-calm-fade-in overflow-hidden rounded-xl border border-[#DCE9E4] bg-white shadow-[0_18px_46px_rgba(23,33,29,0.09)]"
    >
      <div className="lg:grid lg:grid-cols-[74px_1fr]">
        <PreviewSideNav />
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:grid lg:grid-cols-[1fr_190px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[#17211D]">今日の記録</h2>
                <p className="mt-1 text-sm text-[#50615B]">2026年6月6日（土）14:30</p>
              </div>
              <button className="hidden rounded-lg bg-[#00A67E] px-4 py-2 text-sm font-semibold text-white md:inline-flex">
                新しく記録する
              </button>
            </div>

            <div className="mt-5 grid gap-3 rounded-lg border border-[#DCE9E4] bg-white p-4 sm:grid-cols-4">
              <PreviewItem label="強度">
                <span className="text-5xl font-semibold leading-none text-[#008F6D]">4</span>
                <span className="ml-1 text-sm text-[#50615B]">/10</span>
              </PreviewItem>
              <PreviewItem label="部位">
                <div className="flex flex-col gap-2">
                  <HeadIcon />
                  <span className="font-semibold">こめかみ</span>
                </div>
              </PreviewItem>
              <PreviewItem label="服薬">
                <div className="flex flex-col gap-2">
                  <NoMedicineIcon />
                  <span className="font-semibold">服薬なし</span>
                </div>
              </PreviewItem>
              <PreviewItem label="対処・メモ">
                <div className="flex flex-col gap-2">
                  <LeafIcon />
                  <span className="font-semibold">休憩で改善</span>
                </div>
              </PreviewItem>
            </div>

            <div className="mt-5 rounded-lg border border-[#E8F0EC] bg-[#F8FAF9] p-4">
              <p className="text-sm font-semibold text-[#17211D]">メモ</p>
              <p className="mt-2 text-sm leading-6 text-[#50615B]">
                午後の仕事中に頭が重くなった。休憩して少し横になったら楽になった。
              </p>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">今週の記録</h3>
                <a href="/records" className="text-sm font-semibold text-[#008F6D]">
                  一覧を見る
                </a>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {weekRecords.map((record) => (
                  <div
                    key={record.day}
                    className={`rounded-lg border p-2 text-center ${
                      record.day === "土"
                        ? "border-[#CFE8DF] bg-[#E6F8F2] text-[#008F6D]"
                        : "border-[#E8F0EC] bg-white text-[#17211D]"
                    }`}
                  >
                    <p className="text-xs">{record.day}</p>
                    <p className="mt-1 text-xl font-semibold">{record.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-[#DCE9E4] bg-white p-4">
            <h3 className="text-base font-semibold text-[#17211D]">今週の傾向</h3>
            <p className="mt-1 text-sm text-[#50615B]">6/1〜6/6</p>
            <div className="mt-5 rounded-lg bg-[#F8FAF9] p-4">
              <p className="text-sm text-[#50615B]">平均の強度</p>
              <p className="mt-1 text-3xl font-semibold text-[#17211D]">
                3.6<span className="text-sm font-normal text-[#50615B]"> /10</span>
              </p>
              <TrendLine />
            </div>
            <div className="mt-4 rounded-lg border border-[#E8F0EC] p-4">
              <p className="text-sm text-[#50615B]">記録した日数</p>
              <p className="mt-1 text-3xl font-semibold text-[#17211D]">
                5<span className="text-sm font-normal text-[#50615B]"> /7日</span>
              </p>
              <div className="mt-3 h-2 rounded-full bg-[#E8F0EC]">
                <div className="h-full w-[72%] rounded-full bg-[#00A67E]" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function PreviewSideNav() {
  const navItems = [
    { label: "ホーム", icon: "home", active: true },
    { label: "記録一覧", icon: "list" },
    { label: "カレンダー", icon: "calendar" },
    { label: "統計", icon: "chart" },
    { label: "設定", icon: "settings" },
  ];

  return (
    <nav
      aria-label="プレビュー内ナビゲーション"
      className="hidden border-r border-[#E8F0EC] bg-[#F8FAF9] px-2 py-4 lg:flex lg:flex-col lg:items-center lg:gap-2"
    >
      {navItems.map((item) => (
        <div
          key={item.label}
          className={`flex w-full flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-[11px] ${
            item.active ? "bg-[#E6F8F2] font-semibold text-[#008F6D]" : "text-[#50615B]"
          }`}
        >
          <NavIcon name={item.icon} />
          <span className="leading-tight">{item.label}</span>
        </div>
      ))}
    </nav>
  );
}

function NavIcon({ name }: { name: string }) {
  if (name === "home") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
        <path d="m4 11 8-7 8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8Z" fill="currentColor" opacity="0.9" />
      </svg>
    );
  }

  if (name === "list") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
        <path d="M8 7h10M8 12h10M8 17h10M5 7h.01M5 12h.01M5 17h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
        <rect height="15" rx="2" stroke="currentColor" strokeWidth="2" width="16" x="4" y="5" />
        <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2" />
        <path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.9-1.1L14.3 3h-4.6l-.4 2.9A7 7 0 0 0 7.5 7L5.1 6 3 9.4l2.1 1.5A7 7 0 0 0 5 12c0 .4 0 .7.1 1.1L3 14.6 5.1 18l2.4-1a7 7 0 0 0 1.8 1.1l.4 2.9h4.6l.4-2.9a7 7 0 0 0 1.8-1.1l2.4 1 2.1-3.4-2.1-1.5c.1-.4.1-.7.1-1.1Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function PreviewItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-[#E8F0EC] sm:border-r sm:last:border-r-0 sm:pr-3">
      <p className="mb-2 text-xs font-semibold text-[#50615B]">{label}</p>
      <div className="min-h-16 text-[#17211D]">{children}</div>
    </div>
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

function TrendLine() {
  return (
    <svg aria-hidden="true" className="mt-4 h-20 w-full text-[#008F6D]" fill="none" viewBox="0 0 170 76">
      <path d="M7 55C22 31 34 66 50 43S75 20 91 48s31-37 47-15 17 7 25-3" stroke="#CFE8DF" strokeLinecap="round" strokeWidth="12" />
      <path d="M7 55C22 31 34 66 50 43S75 20 91 48s31-37 47-15 17 7 25-3" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      {[7, 50, 91, 138, 163].map((cx, index) => (
        <circle key={cx} cx={cx} cy={[55, 43, 48, 33, 30][index]} fill="white" r="4" stroke="currentColor" strokeWidth="2" />
      ))}
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <rect height="11" rx="2" stroke="currentColor" strokeWidth="2" width="16" x="4" y="10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
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

function HeartIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 20s-7-4.6-9-9.2C1.2 6.8 5.4 3.4 8.7 6.3L12 9.2l3.3-2.9c3.3-2.9 7.5.5 5.7 4.5C19 15.4 12 20 12 20Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function HeadIcon() {
  return (
    <svg aria-hidden="true" className="h-10 w-12 text-[#8BCFBE]" fill="none" viewBox="0 0 48 40">
      <path d="M31 34H17v-7.5c-4.5-2-7.5-6.4-7.5-11.5C9.5 7.8 15.8 2 23.5 2S37.5 7.8 37.5 15c0 5.1-2.9 9.5-7 11.6" stroke="#B8C4C0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="34" cy="12" fill="currentColor" opacity="0.8" r="7" />
    </svg>
  );
}

function NoMedicineIcon() {
  return (
    <svg aria-hidden="true" className="size-10 text-[#B8C4C0]" fill="none" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="2" />
      <path d="M10 30 30 10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg aria-hidden="true" className="size-10 text-[#8BCFBE]" fill="none" viewBox="0 0 40 40">
      <path d="M8 30c13 0 22-9 22-22C17 8 8 17 8 30Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M8 30 25 13M20 28c6 0 12-5 12-12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
