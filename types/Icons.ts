import type * as iconSet from '@lucide/vue';
import type { Component } from 'vue';

export type IconName = {
  [Name in keyof typeof iconSet]: (typeof iconSet)[Name] extends Component ? Name : never;
}[keyof typeof iconSet];
