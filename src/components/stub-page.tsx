export function StubPage({
  title,
  subtitle,
  next,
}: {
  title: string;
  subtitle: string;
  next: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
        <p className="text-sm text-muted-foreground">{next}</p>
      </div>
    </div>
  );
}
