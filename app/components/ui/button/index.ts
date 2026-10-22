import { type VariantProps, cva } from 'class-variance-authority';

export { default as Button } from './Button.vue';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300',
  {
    variants: {
      variant: {
        default: 'bg-blue-700 text-white hover:bg-blue-800 dark:bg-muted dark:text-foreground dark:hover:bg-muted/90',
        cart: 'bg-blue-700 text-white hover:bg-blue-800 dark:!bg-primary dark:!text-primary-foreground dark:hover:!bg-primary/90',
        // The project's green-800 (#007452) keeps white text above 4.5:1 in both themes; green-700 does not.
        success: 'bg-green-800 text-white hover:bg-green-900',
        destructive: 'bg-red-600 text-slate-50 hover:bg-red-700 dark:bg-red-900 dark:text-slate-50 dark:hover:bg-red-900/90',
        outline:
          'border border-input bg-card hover:bg-accent hover:text-foreground dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50',
        secondary: 'bg-secondary text-foreground hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80',
        ghost: 'hover:bg-accent dark:hover:bg-slate-800 dark:hover:text-slate-50',
        link: 'text-foreground underline-offset-4 hover:text-blue-500 dark:text-slate-50 font-light',
        // Selectable option cards (checkout payment methods, saved cards): bordered, blue border and tint when chosen.
        option: 'rounded-lg border border-border bg-card hover:border-blue-500 hover:bg-blue-500/5 dark:bg-slate-950',
        'option-selected': 'rounded-lg border border-blue-500 bg-blue-500/5 dark:bg-blue-500/10',
        'option-dashed': 'rounded-lg border border-dashed border-border bg-card hover:border-blue-500 dark:bg-slate-950',
        'option-dashed-selected': 'rounded-lg border border-dashed border-blue-500 bg-card dark:bg-slate-950',
        // Unframed row whose content supplies its own hover cue (accordion headers, radio rows).
        bare: 'bg-transparent',
      },
      size: {
        default: 'h-10 px-4 py-2',
        xs: 'h-8 rounded-md px-3',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-9 w-9',
        card: 'h-auto p-3',
        'card-compact': 'h-auto px-3 py-2',
        row: 'h-auto px-0 py-2',
        flush: 'h-auto p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
