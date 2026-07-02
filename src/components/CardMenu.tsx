import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type CardMenuItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  icon?: ReactNode;
};

type CardMenuProps = {
  ariaLabel: string;
  items: CardMenuItem[];
  align?: "left" | "right";
};

export function CardMenu({ ariaLabel, items, align = "right" }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-warm-500 transition hover:border-primary hover:text-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/15"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>

      {open ? (
        <div
          className={`absolute top-12 z-20 min-w-[210px] rounded-card border border-border bg-surface p-2 shadow-soft ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex w-full items-center gap-2 rounded-ctrl px-3 py-2.5 text-left text-sm font-medium transition ${
                item.tone === "danger"
                  ? "text-primary-strong hover:bg-danger-soft"
                  : "text-warm-700 hover:bg-sunken"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
