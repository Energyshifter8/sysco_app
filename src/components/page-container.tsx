import { cn } from "@/lib/utils";

/**
 * The single content column every dashboard page sits in.
 *
 * The shell's `<main>` is deliberately full-bleed: the width cap and the page
 * gutter live here, so every route lines up at the same edges instead of each
 * picking its own `maxWidth`.
 */
export function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-6 md:px-6", className)} {...props} />;
}

export interface PageHeaderProps {
  title: string;
  /** Short line under the title — a count, a date range, a one-line summary. */
  description?: React.ReactNode;
  /** Filters or buttons; right-aligned on desktop, wrapped underneath on mobile. */
  actions?: React.ReactNode;
  className?: string;
}

/** Title + description on the left, actions on the right. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "1.3rem",
            fontWeight: 800,
            color: "#E8E8E8",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="mt-1"
            style={{
              color: "#6B7280",
              fontSize: "0.75rem",
              fontFamily: "var(--font-jetbrains)",
            }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Section heading inside a page — one step down from `PageHeader`. */
export function SectionTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("mb-3", className)}
      style={{
        fontFamily: "var(--font-jetbrains)",
        fontSize: "0.7rem",
        fontWeight: 700,
        color: "#6B7280",
        letterSpacing: "0.1em",
      }}
      {...props}
    />
  );
}
