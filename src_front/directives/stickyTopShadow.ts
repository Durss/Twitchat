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

    // Read the CSS `top` value of the sticky element (e.g. -.7em → pixels)
    const stickyTop = parseFloat(getComputedStyle(el).top) || 0;

    // Compute the element's natural position within the scrollable content
    // using getBoundingClientRect (works regardless of offsetParent chain).
    // Must be captured at mount before any scrolling occurs.
    const naturalOffset =
      el.getBoundingClientRect().top
      - scrollContainer.getBoundingClientRect().top
      + scrollContainer.scrollTop;

    const onScroll = () => {
      // Element is stuck once the container has scrolled past
      // the element's natural resting position minus its sticky top.
      const stuck = scrollContainer.scrollTop >= naturalOffset - stickyTop;
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
