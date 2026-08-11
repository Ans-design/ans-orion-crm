'use client';

import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type OrionRadioCardOption = {
  value: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
};

const TONE_LIGHT = {
  base: 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:bg-[#F9FAFB]',
  selected: 'orion-radio-card--selected border-[#D7194A] bg-[#FFF1F4] ring-1 ring-[#D7194A]/15',
  radio: 'border-[#D1D5DB] bg-white',
  radioSelected: 'border-[#D7194A] bg-[#FFF1F4]',
  icon: 'border-[#E5E7EB] bg-[#F3F4F6] text-[#667085]',
  iconSelected: 'border-[#FECDD3] bg-[#FFE4E8] text-[#D7194A]',
  label: 'text-[#111827]',
  desc: 'text-[#667085]',
};

export function OrionRadioCard({
  name,
  value,
  selected,
  onSelect,
  option,
  className,
  tone = 'default',
  compact = false,
}: {
  name: string;
  value: string;
  selected: boolean;
  onSelect: (value: string) => void;
  option: OrionRadioCardOption;
  className?: string;
  tone?: 'default' | 'light';
  compact?: boolean;
}) {
  const Icon = option.icon;
  const light = tone === 'light';
  return (
    <motion.label
      layout
      className={cn(
        'orion-radio-card group flex cursor-pointer items-center rounded-[7px] border transition-all duration-200',
        compact ? 'gap-2.5 p-2.5' : 'gap-4 p-4',
        light
          ? selected
            ? TONE_LIGHT.selected
            : TONE_LIGHT.base
          : selected
            ? 'orion-radio-card--selected border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[var(--bg-selected-soft)]'
            : 'border-[var(--border-soft)] bg-transparent hover:border-[var(--border-standard)] hover:bg-[var(--bg-row-hover)]',
        className,
      )}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.15 }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
          light
            ? selected
              ? TONE_LIGHT.radioSelected
              : TONE_LIGHT.radio
            : selected
              ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]'
              : 'border-[var(--text-subtle)] bg-[var(--bg-card)]',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'h-2.5 w-2.5 rounded-full transition-transform duration-200',
            light ? 'bg-[#D7194A]' : 'bg-[var(--primary)]',
            selected ? 'scale-100' : 'scale-0',
          )}
        />
      </span>
      {Icon ? (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-[7px] border transition-colors duration-200',
            compact ? 'h-8 w-8' : 'h-10 w-10',
            light
              ? selected
                ? TONE_LIGHT.iconSelected
                : TONE_LIGHT.icon
              : selected
                ? 'border-[color-mix(in_srgb,var(--primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]'
                : 'border-[var(--border-soft)] bg-[var(--bg-chip)] text-[var(--text-muted)]',
          )}
          aria-hidden
        >
          <Icon size={compact ? 16 : 20} strokeWidth={2} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-semibold',
            light ? TONE_LIGHT.label : 'text-[var(--text-main)]',
          )}
        >
          {option.label}
        </span>
        {option.description ? (
          <span
            className={cn(
              'mt-0.5 block leading-snug',
              compact ? 'text-xs line-clamp-2' : 'text-sm leading-relaxed',
              light ? TONE_LIGHT.desc : 'text-[var(--text-muted)]',
            )}
          >
            {option.description}
          </span>
        ) : null}
      </span>
    </motion.label>
  );
}

export function OrionRadioCardGroup({
  name,
  value,
  onChange,
  options,
  className,
  tone = 'default',
  compact = false,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: OrionRadioCardOption[];
  className?: string;
  tone?: 'default' | 'light';
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)} role="radiogroup" aria-required="true">
      {options.map((opt) => (
        <OrionRadioCard
          key={opt.value}
          name={name}
          value={opt.value}
          selected={value === opt.value}
          onSelect={onChange}
          option={opt}
          tone={tone}
          compact={compact}
        />
      ))}
    </div>
  );
}
