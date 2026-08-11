import { AppPageHeader } from '@/components/ui/app-ui';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function SettingsHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-4 pb-6 border-b border-border">
      <Link href="/parametres" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} aria-hidden /> Retour Mon compte
      </Link>
      <AppPageHeader title={title} description={description} className="pb-0 border-b-0" />
    </div>
  );
}

export function SettingsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card border border-border rounded-lg p-5 ${className}`}>{children}</div>;
}
