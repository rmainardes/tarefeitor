export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        Tarefêitor
      </h1>
      <p className="max-w-sm text-base text-foreground/70">
        O placar da casa está a caminho.
      </p>
      <div className="flex gap-3">
        <span className="h-3 w-3 rounded-full bg-pedro" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-vania" aria-hidden />
        <span className="h-3 w-3 rounded-full bg-rodrigo" aria-hidden />
      </div>
    </main>
  );
}
