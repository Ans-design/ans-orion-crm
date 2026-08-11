export type ResponsiveMode = 'phone' | 'tablet' | 'desktop';
export type InputMode = 'touch' | 'fine-pointer' | 'mixed';
export type Orientation = 'portrait' | 'landscape';
export type LayoutDensity = 'comfortable' | 'compact';
export type ResponsivePriority = 'critical' | 'primary' | 'secondary' | 'detail';

export type ColumnPriority = {
  id: string;
  label: string;
  phone: ResponsivePriority;
  tablet: ResponsivePriority;
  desktop: ResponsivePriority;
  cardField?: boolean;
};
