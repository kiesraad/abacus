import * as React from "react";
import { domtoren } from "@kiesraad/util";

type Dimensions = {
  nav: {
    height: number;
  };
  header: {
    top: number;
    height: number;
    minHeight: number;
    maxHeight: number;
  };
};

export class FixedHeaderController {
  private ref: React.RefObject<HTMLDivElement>;
  public registered = false;

  public dim: Dimensions = {
    nav: {
      height: 0
    },
    header: {
      top: 0,
      height: 0,
      minHeight: 80,
      maxHeight: 140
    }
  };

  private navEl: HTMLElement | null = null;
  private headerEl: HTMLElement | null = null;

  private lastY = 0;

  constructor(ref: React.RefObject<HTMLDivElement>) {
    this.ref = ref;
  }

  register() {
    if (this.registered) return;
    if (!this.ref.current) {
      return;
    }
    if (!this.registerElements()) {
      return;
    }
    this.calculateDimensions();
    this.ref.current.classList.add("fixedheader");
    window.addEventListener("scroll", this.handleScroll);
    window.addEventListener("mousemove", this.handleMouse);
    this.registered = true;
  }

  unregister() {
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("mousemove", this.handleMouse);
    if (this.ref.current) {
      this.ref.current.classList.remove("fixedheader");
    }
    this.registered = false;
  }

  registerElements() {
    if (!this.ref.current) {
      return false;
    }
    const nav = domtoren(this.ref.current).first("nav").el("nav");
    if (!nav) {
      return false;
    }
    this.navEl = nav as HTMLElement;
    const header = domtoren(this.ref.current).first("header").el("header");
    if (!header) {
      return false;
    }
    this.headerEl = header as HTMLElement;
    return true;
  }

  calculateDimensions() {
    if (!this.navEl || !this.headerEl) {
      return;
    }
    this.dim.nav.height = this.navEl.clientHeight;
    this.dim.header.top = this.headerEl.getBoundingClientRect().top;
    this.dim.header.height = this.headerEl.clientHeight;

    console.log(this.dim);
  }

  scrollTop(): [number, number] {
    const curY = window.scrollY;
    const lastY = this.lastY;
    this.lastY = curY;
    return [curY, lastY];
  }

  handleMouse = (e: MouseEvent) => {
    const mouseY = e.clientY;
    if (mouseY < 10) {
      this.navEl?.classList.add("show");
    } else {
      this.navEl?.classList.remove("show");
    }
  };

  //TODO: optimize performance once UX expert is happy.
  handleScroll = () => {
    if (!this.ref.current) {
      return;
    }
    const [curY] = this.scrollTop();

    //scroll up
    // if (lastY > curY) {
    //   this.navEl?.classList.add("show");
    // }

    if (curY > this.dim.nav.height) {
      if (this.headerEl) {
        this.headerEl.classList.add("compact");
      }
    } else {
      if (this.headerEl) {
        this.headerEl.classList.remove("compact");
      }
    }
  };
}
