'use client';

import { Check, X } from 'lucide-react';
import { passwordRuleResults, passwordStrengthScore } from '@/lib/auth/password-policy';
import { ANS } from '@/lib/ans-colors';

type Props = {
  password: string;
  showBar?: boolean;
};

export function PasswordStrengthHints({ password, showBar = true }: Props) {
  const rules = passwordRuleResults(password);
  const score = passwordStrengthScore(password);
  const barColor = score >= 100 ? '#22c55e' : score >= 60 ? ANS.orange : '#ef4444';

  return (
    <div className="space-y-2">
      {showBar && password.length > 0 && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${score}%`, background: barColor }}
          />
        </div>
      )}
      <ul className="space-y-1">
        {rules.map((rule) => (
          <li key={rule.id} className="flex items-center gap-1.5 text-[11px]">
            {rule.ok ? (
              <Check size={12} className="text-green-500 shrink-0" />
            ) : (
              <X size={12} className="text-muted-foreground shrink-0" />
            )}
            <span className={rule.ok ? 'text-green-600' : 'text-muted-foreground'}>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
