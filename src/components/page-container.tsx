import { cn } from "@/lib/utils";

/**
 * The single content column every dashboard page sits in.
 *
 * The shell's `<main>` is deliberately full-bleed: the width cap and the page
 * gutter live here, so every route lines up at the same edges instead of each
 * picking its own `maxWidth`.
 */
export function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 md:py-8 xl:px-8", className)}
      {...props}
    />
  );
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
        <h1 className="type-page-title">{title}</h1>
        {description && <p className="type-page-subtitle mt-1">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Section heading inside a page — one step down from `PageHeader`. */
export function SectionTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("type-section-title mb-3", className)} {...props} />;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  /** One line — what is missing, not a paragraph about it. */
  message: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * The "nothing here yet" block.
 *
 * Deliberately small: an empty list used to reserve a tall bordered box that
 * read as broken layout rather than as an absence.
 */
export function EmptyState({ icon, message, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 px-4 py-5", className)}>
      {icon && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#6B7280]">
          {icon}
        </span>
      )}
      <p className="type-body min-w-0 flex-1">{message}</p>
      {action}
    </div>
  );
}
