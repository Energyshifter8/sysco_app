"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

/**
 * Password field with a show/hide toggle, shared by the login and sign-up forms.
 *
 * It keeps the hand-rolled `.auth-input` markup rather than wrapping the shadcn
 * `Input`, because `globals.css` styles `.auth-input:focus` with `!important`
 * and would override the primitive's focus ring.
 */
function PasswordInput({
  className,
  style,
  radius = "3px",
  fontSize = "0.9rem",
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  radius?: string;
  fontSize?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  const actionLabel = visible ? "Нууц үг нуух" : "Нууц үг харуулах";

  return (
    <div style={{ position: "relative" }}>
      <input
        type={visible ? "text" : "password"}
        className={className ? `auth-input ${className}` : "auth-input"}
        style={{
          width: "100%",
          background: "#1A1A1A",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: radius,
          padding: "10px 42px 10px 12px",
          color: "#E8E8E8",
          fontFamily: "var(--font-jetbrains)",
          fontSize,
          outline: "none",
          boxSizing: "border-box",
          ...style,
        }}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        aria-label={actionLabel}
        aria-pressed={visible}
        title={actionLabel}
        className="group absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md border border-transparent transition-all duration-200 hover:border-white/10 hover:bg-white/10 hover:text-white focus-visible:border-[#8B5CF6] focus-visible:bg-[#8B5CF6]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/30 active:scale-95"
        style={{
          background: visible ? "rgba(139, 92, 246, 0.14)" : "transparent",
          color: visible ? "#A78BFA" : "#6B7280",
          cursor: "pointer",
        }}
      >
        {visible ? (
          <EyeOff size={17} className="transition-transform duration-200 group-hover:scale-110" />
        ) : (
          <Eye size={17} className="transition-transform duration-200 group-hover:scale-110" />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
