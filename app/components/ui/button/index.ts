import { type VariantProps, cva } from 'class-variance-authority';

export { default as Button } from './Button.vue';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300',
  {
    variants: {
      variant: {
        'warning-outline':
          'border border-slate-200 bg-white hover:bg-light-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 border-amber-800 font-semibold text-amber-900 hover:bg-amber-100 focus-visible:ring-amber-800',
        'catalog-action':
          'bg-blue-700 text-white hover:bg-blue-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90 aria-disabled:bg-slate-200 aria-disabled:text-slate-800 aria-disabled:opacity-100',
        'purchase-action':
          'bg-blue-700 text-white hover:bg-blue-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90 aria-disabled:opacity-50',
        'muted-link': 'text-slate-900 underline-offset-4 hover:text-blue-500 dark:text-slate-50 font-light text-slate-500',
        'recovery-link':
          'text-slate-900 underline-offset-4 hover:text-blue-500 dark:text-slate-50 font-light rounded font-semibold underline underline-offset-2 hover:text-rose-900',
        default: 'bg-blue-700 text-white hover:bg-blue-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90',
        destructive: 'bg-red-600 text-slate-50 hover:bg-red-700 dark:bg-red-900 dark:text-slate-50 dark:hover:bg-red-900/90',
        outline:
          'border border-slate-200 bg-white hover:bg-light-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50',
        secondary: 'bg-light-400 text-neutral-700 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80',
        ghost: 'hover:bg-light-500 dark:hover:bg-slate-800 dark:hover:text-slate-50',
        link: 'text-slate-900 underline-offset-4 hover:text-blue-500 dark:text-slate-50 font-light',
      },
      size: {
        default: 'h-10 px-4 py-2',
        xs: 'h-8 rounded-md px-3',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-9 w-9',
        warning: 'h-10 rounded-lg px-3 py-2',
        catalog: 'h-10 gap-2 px-0 py-2 md:rounded-none md:rounded-br-xl md:rounded-tl-xl md:px-6 md:py-3',
        purchase: 'h-10 px-5 py-2',
        'inline-link': 'h-10 px-0 py-2 text-xs',
        'compact-link': 'h-10 px-4 py-2 text-xs',
        retry: 'h-10 px-2 py-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
