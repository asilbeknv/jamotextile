export function FormMessage({ error, info }: { error?: string; info?: string }) {
  if (error)
    return (
      <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-sm font-medium text-bad">
        {error}
      </p>
    );
  if (info) return <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm font-medium text-accent">{info}</p>;
  return null;
}
