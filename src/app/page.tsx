export default function Home() {
  return (
    <main className="min-h-dvh flex items-center">
      <div className="mx-auto w-full max-w-screen-lg px-4 md:grid md:grid-cols-2 md:gap-12">
        <section className="flex flex-col gap-4 justify-center text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">頭痛ノート</h1>
          <p className="text-base md:text-lg opacity-80">あなたの頭痛をより深く理解する</p>
        </section>
      </div>
    </main>
  );
}
