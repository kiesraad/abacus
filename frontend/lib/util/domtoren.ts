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
}

export function domtoren(el: HTMLElement) {
  return new DomToren(el);
}
