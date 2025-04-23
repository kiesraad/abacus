export class DomToren {
  _el: HTMLElement;

  constructor(el: HTMLElement) {
    this._el = el;
  }

  public closest(selector: string) {
    const nextEl = this._el.closest(selector);
    if (nextEl) {
      this._el = nextEl as HTMLElement;
    }
    return this;
  }

  public toggleClass(className: string) {
    this._el.classList.toggle(className);
    return this;
  }

  public removeClass(className: string) {
    this._el.classList.remove(className);
    return this;
  }

  public addClass(className: string) {
    this._el.classList.add(className);
    return this;
  }

  public el() {
    return this._el;
  }

  // substitute for element.scrollIntoView which also scrolls the parent container
  public scrollIntoView(margin = 0) {
    const parent = this._el.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const elementRect = this._el.getBoundingClientRect();

    // Check if the element is fully visible within the parent container vertically
    const isFullyVisible =
      elementRect.top >= parentRect.top + margin && elementRect.bottom <= parentRect.bottom - margin;

    if (isFullyVisible) {
      return;
    }

    // Calculate new scroll position to bring the element into view
    let newScrollTop = parent.scrollTop;

    if (elementRect.top < parentRect.top + margin) {
      // Scroll up to align the top of the element with the top margin
      newScrollTop -= parentRect.top - elementRect.top + margin;
    } else if (elementRect.bottom > parentRect.bottom - margin) {
      // Scroll down to align the bottom of the element with the bottom margin
      newScrollTop += elementRect.bottom - parentRect.bottom + margin;
    }

    // Smooth scroll to the new calculated position
    parent.scrollTo({
      top: newScrollTop,
      behavior: "smooth",
    });
  }
}

export function domtoren(el: HTMLElement) {
  return new DomToren(el);
}
