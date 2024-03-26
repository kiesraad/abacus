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

  public toggleClass(className: string) {
    this._el.classList.toggle(className);
    return this;
  }

  public el() {
    return this._el;
  }
}

export function domtoren(el: HTMLElement) {
  return new DomToren(el);
}
