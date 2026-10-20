import { cva, type VariantProps } from 'class-variance-authority';

export { default as Label } from './Label.vue';

export const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-500',
  {
    variants: { variant: { default: '', strong: 'text-slate-800 leading-5' } },
    defaultVariants: { variant: 'default' },
  },
);
export type LabelVariants = VariantProps<typeof labelVariants>;
