/**
 * Shared motion policy.
 *
 *   html[data-motion="on"]   explicit choice from the header toggle: animate
 *   html[data-motion="off"]  explicit choice: no animation
 *   (absent)                 follow the OS: animate unless prefers-reduced-motion
 *
 * The choice is remembered in localStorage and applied by an inline script in
 * <head> before first paint, so CSS can rely on it too.
 */

const STORAGE_KEY = 'planktos:motion';
const root = document.documentElement;
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set<(on: boolean) => void>();

export function motionEnabled(): boolean {
  if (root.dataset.motion === 'on') return true;
  if (root.dataset.motion === 'off') return false;
  return !reducedQuery.matches;
}

/** Called whenever motion is switched on/off (toggle or OS setting). */
export function onMotionChange(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  const on = motionEnabled();
  listeners.forEach((fn) => fn(on));
}

reducedQuery.addEventListener('change', emit);

export function setMotion(on: boolean) {
  root.dataset.motion = on ? 'on' : 'off';
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Private mode / blocked storage: the choice lasts for this page only.
  }
  emit();
}

/**
 * Run an animation loop only while it can be seen: motion enabled, element on
 * screen and the tab visible. `frame` receives the elapsed time in ms.
 * Returns a disposer.
 */
export function animateWhileVisible(el: Element, frame: (t: number, dt: number) => void, onStop?: () => void) {
  let raf = 0;
  let last = 0;
  let onScreen = true;

  const tick = (t: number) => {
    const dt = last ? Math.min(t - last, 64) : 16;
    last = t;
    frame(t, dt);
    raf = requestAnimationFrame(tick);
  };
  const update = () => {
    const run = motionEnabled() && onScreen && !document.hidden;
    if (run && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      onStop?.();
    }
  };

  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    update();
  });
  io.observe(el);
  document.addEventListener('visibilitychange', update);
  const off = onMotionChange(update);
  update();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    document.removeEventListener('visibilitychange', update);
    off();
  };
}
