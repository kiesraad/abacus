import type { Locator, Page } from "@playwright/test";

export class IncludeAllCandidates {
  readonly header: Locator;
  readonly dataEntryFinished: Locator;
  readonly dataEntryFinishedAlert: Locator;
  readonly title: Locator;
  readonly noDeceased: Locator;
  readonly hasDeceased: Locator;
  readonly next: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Zetelverdeling" });

    this.dataEntryFinished = page.getByRole("strong").filter({
      hasText: "Invoerfase afgerond",
    });
    this.dataEntryFinishedAlert = page.getByRole("alert").filter({ has: this.dataEntryFinished });

    this.title = page.getByRole("heading", { level: 2, name: "Zijn er overleden kandidaten?" });

    this.noDeceased = page.getByRole("radio", { name: "Er zijn geen overleden kandidaten" });
    this.hasDeceased = page.getByRole("radio", { name: "Eén of meerdere kandidaten zijn overleden" });
    this.next = page.getByRole("button", { name: "Volgende" });
  }
}
