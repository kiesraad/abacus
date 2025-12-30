import type { Locator, Page } from "@playwright/test";

import { CheckDefinitionBasePgObj } from "./CheckDefinitionBasePgObj";

export class CheckCandidateDefinitionPgObj extends CheckDefinitionBasePgObj {
  readonly header: Locator;

  constructor(protected readonly page: Page) {
    super(page);
    this.header = page.getByRole("heading", { level: 2, name: "Controleer kandidatenlijsten" });
  }
}
