import { cva, type VariantProps } from 'class-variance-authority';

export { default as Textarea } from './Textarea.vue';

export const textareaVariants = cva(
  'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: { variant: { default: '', surface: 'bg-white' } },
    defaultVariants: { variant: 'default' },
  },
);
export type TextareaVariants = VariantProps<typeof textareaVariants>;
