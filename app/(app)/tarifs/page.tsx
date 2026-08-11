'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TarifsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/administration/prix');
  }, [router]);

  return (
    <p className="text-sm text-muted-foreground py-12 text-center">
      Redirection vers Moteur de prix…
    </p>
  );
}
