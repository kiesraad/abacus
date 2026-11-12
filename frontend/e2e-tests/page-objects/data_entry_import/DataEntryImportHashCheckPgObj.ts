import type { Locator, Page } from "@playwright/test";

import { CheckHashBasePgObj } from "../CheckHashBasePgObj";

export class DataEntryImportHashCheckPgObj extends CheckHashBasePgObj {
  readonly header: Locator;

  constructor(protected readonly page: Page) {
    super(page);
    this.header = page.getByRole("heading", { level: 2, name: "Controleer tellingsbestand" });
  }
}
