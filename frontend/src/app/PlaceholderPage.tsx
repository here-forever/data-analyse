interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="workspace-page-header">
      <p className="text-sm font-bold text-lilac">MVP workspace</p>
      <h2 className="mt-1 text-2xl font-bold text-ink">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        {description}
      </p>
    </section>
  );
}
