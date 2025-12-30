import type { ErrorReference } from "@/types/generated/openapi";

export const redirectToHomePageErrorReferences: readonly ErrorReference[] = [
  "DataEntryAlreadyClaimed",
  "DataEntryAlreadyFinalised",
  "DataEntryNotAllowed",
  "InvalidStateTransition",
];
