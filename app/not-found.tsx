import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="cmjn-bar fixed top-0 left-0 right-0" />
      <div className="w-16 h-16 rounded-[7px] bg-muted flex items-center justify-center mb-6">
        <FileQuestion size={32} className="text-muted-foreground" />
      </div>
      <h1 className="font-display text-2xl font-bold mb-2">Page introuvable</h1>
      <p className="text-muted-foreground text-sm mb-6">Cette page n&apos;existe pas dans ANS ORION.</p>
      <Button asChild>
        <Link href="/dashboard">Retour au dashboard</Link>
      </Button>
    </div>
  );
}
