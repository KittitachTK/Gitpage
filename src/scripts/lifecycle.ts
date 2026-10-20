/**
 * Page lifecycle under Astro's ClientRouter.
 *
 * Navigation swaps the page body without reloading, and bundled scripts run only
 * once. So every page script registers with `onPage`: its init runs on each page
 * load (first visit and every client-side navigation), checks whether its elements
 * are on this page, and returns a cleanup that runs just before the page is swapped
 * out. Listeners on window/document belong in that cleanup.
 */

export type Cleanup = void | (() => void);

export function onPage(init: () => Cleanup) {
  document.addEventListener('astro:page-load', () => {
    const cleanup = init();
    if (typeof cleanup === 'function') document.addEventListener('astro:before-swap', cleanup, { once: true });
  });
}

/** addEventListener that returns its own remover. */
export function listen<K extends keyof WindowEventMap>(target: Window, type: K, fn: (e: WindowEventMap[K]) => void, opts?: AddEventListenerOptions): () => void;
export function listen<K extends keyof DocumentEventMap>(target: Document, type: K, fn: (e: DocumentEventMap[K]) => void, opts?: AddEventListenerOptions): () => void;
export function listen(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions): () => void;
export function listen(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) {
  target.addEventListener(type, fn, opts);
  return () => target.removeEventListener(type, fn, opts);
}

/** Run several cleanups as one. */
export const all = (...fns: (Cleanup | undefined)[]) => () => fns.forEach((f) => typeof f === 'function' && f());
