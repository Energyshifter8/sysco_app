"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";
import { CircleIcon } from "lucide-react";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "aspect-square size-4 shrink-0 rounded-full border border-input text-primary transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary dark:bg-input/30",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

/** Row of segments — the container for `RadioGroupSegment`. */
function RadioGroupSegments({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group-segments"
      className={cn(
        "flex w-full gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-1",
        className,
      )}
      {...props}
    />
  );
}

/**
 * One cell of a segmented control: the label sits inside the control and the
 * selected cell is filled rather than dotted. `accent` tints the selected
 * state, so a segment can carry its own status colour.
 */
function RadioGroupSegment({
  className,
  style,
  accent = "var(--primary)",
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & { accent?: string }) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-segment"
      className={cn(
        "flex h-9 flex-1 cursor-pointer items-center justify-center rounded-md border border-transparent px-3 text-center whitespace-nowrap text-[#6B7280] transition-colors outline-none",
        "hover:text-[#9CA3AF] focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-[#6B7280]",
        "data-[state=checked]:border-[color-mix(in_srgb,var(--segment-accent)_40%,transparent)]",
        "data-[state=checked]:bg-[color-mix(in_srgb,var(--segment-accent)_16%,transparent)]",
        "data-[state=checked]:text-[var(--segment-accent)]",
        className,
      )}
      style={
        {
          fontFamily: "var(--font-jetbrains)",
          fontSize: "0.8125rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          "--segment-accent": accent,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem, RadioGroupSegment, RadioGroupSegments };
