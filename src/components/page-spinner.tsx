import { Loader2 } from "lucide-react";

/** The page-level loading state, shared by route guards and Suspense fallbacks. */
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
