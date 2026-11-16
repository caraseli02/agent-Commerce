import { type VariantProps, cva } from 'class-variance-authority';

export { default as Button } from './Button.vue';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
  {
    variants: {
      variant: {
        // Graphite ink: the default action in both themes.
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/88 active:bg-primary/80',
        // The signal key: search, add to cart and checkout. Ink text keeps 6.5:1 on the orange fill.
        cart: 'bg-signal text-signal-foreground font-semibold shadow-xs hover:bg-signal/88 active:bg-signal/80',
        // The project's green-800 (#005a40) keeps white text above 8:1 in both themes.
        success: 'bg-green-800 text-white hover:bg-green-900',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-foreground underline-offset-4 hover:text-signal-text',
        // Selectable option cards (checkout payment methods, saved cards): bordered; ink border and tint when chosen.
        option: 'rounded-lg border border-border bg-card hover:border-input hover:bg-accent/60',
        'option-selected': 'rounded-lg border border-primary bg-card ring-1 ring-primary',
        'option-dashed': 'rounded-lg border border-dashed border-input bg-card hover:border-primary',
        'option-dashed-selected': 'rounded-lg border border-dashed border-primary bg-card',
        // Unframed row whose content supplies its own hover cue (accordion headers, radio rows).
        bare: 'bg-transparent',
        // Submit segment fused to the right edge of a bordered search field.
        'input-addon': 'rounded-none bg-signal text-signal-foreground hover:bg-signal/88',
      },
      size: {
        default: 'h-10 px-4 py-2',
        xs: 'h-8 rounded-md px-3',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-lg px-6 text-[15px]',
        icon: 'h-9 w-9',
        card: 'h-auto p-3',
        'card-compact': 'h-auto px-3 py-2',
        row: 'h-auto px-0 py-2',
        flush: 'h-auto p-0',
        addon: 'h-full px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
