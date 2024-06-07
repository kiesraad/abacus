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

  //TODO: add test
  public text(text: string) {
    this._el.textContent = text;
    return this;
  }

  //TODO: add test
  public first(selector: string) {
    const nextEl = this._el.querySelector(selector);
    if (nextEl) {
      this._el = nextEl as HTMLElement;
    }
    return this;
  }

  //TODO: add test
  public show() {
    this._el.style.display = "block";
    return this;
  }

  //TODO: add test
  public hide() {
    this._el.style.display = "none";
    return this;
  }

  //TODO: add test
  public left(left: number) {
    this._el.style.left = `${left}px`;
    return this;
  }

  //TODO: add test
  public top(top: number) {
    this._el.style.top = `${top}px`;
    return this;
  }

  public el() {
    return this._el;
  }
}

export function domtoren(el: HTMLElement) {
  return new DomToren(el);
}
