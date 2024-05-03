export class DomToren {
  _el: Element;

  constructor(el: HTMLElement) {
    this._el = el;
  }

  public closest(selector: string) {
    const nextEl = this._el.closest(selector);
    if (nextEl) {
      this._el = nextEl;
    }
    return this;
  }

  public first(tag: string) {
    const nextEl = this._el.querySelector(tag);
    if (nextEl) {
      this._el = nextEl;
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

  public el(isTag?: string) {
    if (isTag) {
      if (this._el.tagName.toLowerCase() !== isTag.toLowerCase()) {
        return null;
      }
    }
    return this._el;
  }
}

export function domtoren(el: HTMLElement) {
  return new DomToren(el);
}
