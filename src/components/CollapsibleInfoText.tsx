"use client";

import { ReactNode, useState } from "react";

type CollapsibleInfoTextProps = {
  label: string;
  children: ReactNode;
  suffix?: ReactNode;
  className?: string;
};

export function CollapsibleInfoText({
  label,
  children,
  suffix,
  className,
}: CollapsibleInfoTextProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <div className="inline-flex items-baseline gap-1">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="underline decoration-dotted underline-offset-2 hover:text-stone-50"
          aria-expanded={isOpen}
        >
          {label}
        </button>
        {suffix}
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "mt-2 max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="rounded-md border border-stone-700/80 bg-stone-800/60 p-3 text-xs leading-relaxed text-stone-300">
          {children}
        </div>
      </div>
    </div>
  );
}
