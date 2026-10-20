import { cva, type VariantProps } from 'class-variance-authority';

export { default as Dialog } from './Dialog.vue';
export { default as DialogClose } from './DialogClose.vue';
export { default as DialogTrigger } from './DialogTrigger.vue';
export { default as DialogHeader } from './DialogHeader.vue';
export { default as DialogTitle } from './DialogTitle.vue';
export { default as DialogDescription } from './DialogDescription.vue';
export { default as DialogContent } from './DialogContent.vue';
export { default as DialogFooter } from './DialogFooter.vue';

export const dialogContentVariants = cva('', {
  variants: {
    variant: {
      default: '',
      'responsive-form':
        '!inset-0 !flex !h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col gap-5 overflow-y-auto !border-0 rounded-none p-5 sm:!inset-auto sm:!left-1/2 sm:!top-1/2 sm:!grid sm:!h-auto sm:!w-full sm:!max-w-[640px] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:rounded-lg sm:!border sm:p-6',
    },
  },
  defaultVariants: { variant: 'default' },
});
export type DialogContentVariants = VariantProps<typeof dialogContentVariants>;

export const dialogFooterVariants = cva('', {
  variants: { variant: { default: '', 'safe-area': 'pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:pb-0' } },
  defaultVariants: { variant: 'default' },
});
export type DialogFooterVariants = VariantProps<typeof dialogFooterVariants>;
