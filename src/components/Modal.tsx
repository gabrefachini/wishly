import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
};

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  "2xl": "sm:max-w-6xl",
};

export function Modal({ title, open, onClose, children, size = "lg" }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    previouslyFocusedElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.addEventListener("keydown", handleKeyDown);
    const focusTimeoutId = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElement = dialog.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      (focusableElement ?? dialog).focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimeoutId);
      previouslyFocusedElement.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex w-full max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-modal bg-surface shadow-soft ring-1 ring-border focus:outline-none ${sizeClasses[size]}`}
      >
        <div className="sticky top-0 z-10 flex-shrink-0 border-b border-border bg-surface px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-xl font-bold text-warm-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1 text-sm font-semibold text-warm-500 transition hover:bg-warm-50"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">{children}</div>
      </div>
    </div>
  );
}
