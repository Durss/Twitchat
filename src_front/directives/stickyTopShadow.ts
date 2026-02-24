import type { Directive } from "vue";

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
    const className = binding.value?.className ?? "is-stuck";
    const root = binding.value?.root ?? null;

    const scrollContainer = root ?? el.parentElement;
    if (!scrollContainer) return;

    const onScroll = () => {
      const scrollableHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      // Consider "stuck" if scrolled down at least 10px and there's enough scrollable content to justify a shadow
      const stuck = scrollContainer.scrollTop >= 10 && scrollableHeight > 20;
      el.classList.toggle(className, stuck);
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
