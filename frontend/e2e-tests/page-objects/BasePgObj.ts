import { type Page } from "@playwright/test";

import { NavBar } from "./NavBarPgObj";

export class BasePgObj {
  readonly navBar: NavBar;

  constructor(protected readonly page: Page) {
    this.navBar = new NavBar(page);
  }
}
