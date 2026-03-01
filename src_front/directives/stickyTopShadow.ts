import { ref, type Directive } from "vue";

type StickyOptions = {
  className?: string;
  root?: HTMLElement | null;
};

type ElWithState = HTMLElement & {
  __stickyScrollHandler?: () => void;
  __stickyScrollContainer?: HTMLElement;
};

export const stickyTopShadow: Directive<ElWithState, StickyOptions | undefined> = {
  mounted(el, binding) {
    const HYSTERESIS = 10; // px buffer to prevent oscillation
    const className = binding.value?.className ?? "is-stuck";
    const root = binding.value?.root ?? null;

    const scrollContainer = root ?? el.parentElement;
    if (!scrollContainer) return;

    let wasStuck = false;

    const onScroll = () => {
      const scrollableHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const scrollTop = scrollContainer.scrollTop;
      const hasEnoughContent = scrollableHeight > 20;

      let stuck: boolean;
      if (wasStuck) {
        // Already stuck: only unstick if scrolled back above threshold minus hysteresis
        stuck = hasEnoughContent && scrollTop >= (20 - HYSTERESIS);
      } else {
        // Not stuck: only stick once we pass threshold plus hysteresis
        stuck = hasEnoughContent && scrollTop >= (20 + HYSTERESIS);
      }

      if (stuck !== wasStuck) {
        wasStuck = stuck;
        el.classList.toggle(className, stuck);
      }
    };

    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initial check

    el.__stickyScrollHandler = onScroll;
    el.__stickyScrollContainer = scrollContainer;
  },

  unmounted(el) {
    if (el.__stickyScrollHandler && el.__stickyScrollContainer) {
      el.__stickyScrollContainer.removeEventListener("scroll", el.__stickyScrollHandler);
    }
    delete el.__stickyScrollHandler;
    delete el.__stickyScrollContainer;
  },
};
