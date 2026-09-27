import type { ReactNode } from "react";

export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="pb-6">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border/50 py-4 first:pt-0 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground/90">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground/80">{hint}</p>}
      </div>
      <div className="pt-1">{children}</div>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-mono text-xs text-foreground/90">
        {value}
      </span>
    </div>
  );
}
