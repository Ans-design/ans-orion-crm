"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AdminMacroModule,
  AdminMicroItem,
} from "@/lib/administration/admin-macro-modules";
import { macroHubUrl } from "@/lib/administration/admin-macro-modules";

type Props = {
  macro: AdminMacroModule;
  activeMicro: AdminMicroItem | null;
};

export function AdminMicroContextDropdown({ macro, activeMicro }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label = activeMicro?.label ?? macro.label;

  return (
    <div className="orion-admin-micro-dropdown" ref={ref}>
      <button
        type="button"
        className="orion-admin-micro-dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Sections — ${label}`}
      >
        <span>{label}</span>
        <ChevronDown
          size={18}
          aria-hidden
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          className="orion-admin-micro-dropdown-menu"
          role="listbox"
          aria-label={`Navigation ${macro.label}`}
        >
          <Link
            href={macroHubUrl(macro.id)}
            className="orion-admin-micro-dropdown-hub"
            onClick={() => setOpen(false)}
          >
            ← Hub {macro.label}
          </Link>
          {macro.microItems.filter((m) => !m.hidden).map((micro) => {
            const Icon = micro.icon;
            const isActive = activeMicro?.id === micro.id;
            return (
              <Link
                key={micro.id}
                href={micro.href}
                className={`orion-admin-micro-dropdown-item${isActive ? " is-active" : ""}`}
                role="option"
                aria-selected={isActive}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} aria-hidden />
                <span>{micro.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
