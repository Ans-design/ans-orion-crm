'use client';

type Props = {
  children: React.ReactNode;
  id?: string;
  className?: string;
};

/** Aide courte sous un champ ou une section — guidage discret */
export function UxFieldHint({ children, id, className = '' }: Props) {
  return (
    <p id={id} className={`orion-ux-hint mt-1 ${className}`}>
      {children}
    </p>
  );
}
