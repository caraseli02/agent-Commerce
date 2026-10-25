import Emitter from 'tiny-emitter/instance.js';
import { onBeforeUnmount, onMounted } from 'vue';

// The tiny-emitter bus is a process-wide singleton: a listener added in setup outlives its component,
// and on the server it outlives the request. Subscribe on mount and unsubscribe before unmount.
export function useEmitterListener<T>(event: string, handler: (payload: T) => void) {
  onMounted(() => Emitter.on(event, handler));
  onBeforeUnmount(() => Emitter.off(event, handler));
}
