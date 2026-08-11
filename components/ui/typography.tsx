import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TYPO, type TypoToken } from '@/lib/design/typography';

type TypoProps<T extends ElementType = 'span'> = {
  as?: T;
  token?: TypoToken;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'token' | 'className' | 'children'>;

function TypoBase<T extends ElementType = 'span'>({
  as,
  token = 'body',
  className,
  children,
  ...props
}: TypoProps<T>) {
  const Tag = as ?? 'span';
  return (
    <Tag className={cn(TYPO[token], className)} {...props}>
      {children}
    </Tag>
  );
}

export function PageTitle({ className, ...props }: Omit<TypoProps<'h1'>, 'token' | 'as'>) {
  return <TypoBase as="h1" token="pageTitle" className={className} {...props} />;
}

export function SectionTitle({ className, ...props }: Omit<TypoProps<'h2'>, 'token' | 'as'>) {
  return <TypoBase as="h2" token="sectionTitle" className={className} {...props} />;
}

export function CardTitle({ className, ...props }: Omit<TypoProps<'h3'>, 'token' | 'as'>) {
  return <TypoBase as="h3" token="cardTitle" className={className} {...props} />;
}

export function MetaText({ className, ...props }: Omit<TypoProps, 'token'>) {
  return <TypoBase token="meta" className={className} {...props} />;
}

export function AmountText({ className, ...props }: Omit<TypoProps, 'token'>) {
  return <TypoBase token="amount" className={className} {...props} />;
}

export function CodeText({ className, ...props }: Omit<TypoProps, 'token'>) {
  return <TypoBase token="code" className={className} {...props} />;
}

export { TypoBase as TypoText, TYPO };
