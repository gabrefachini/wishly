import type { ReactNode } from "react";

type ModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, open, onClose, children }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-warm-900/35 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-[32px] bg-porcelain p-5 shadow-soft ring-1 ring-warm-100">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-warm-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold text-warm-500 hover:bg-warm-50"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
