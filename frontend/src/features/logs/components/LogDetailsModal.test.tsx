import { describe, expect, test, vi } from "vitest";
import { LogDetailsModal } from "@/features/logs/components/LogDetailsModal";
import { logMockResponse } from "@/testing/api-mocks/LogMockData";
import { render, screen } from "@/testing/test-utils";
import type { AuditLogEvent } from "@/types/generated/openapi";

describe("LogDetailsModal", () => {
  test("Event details value rendering", async () => {
    // Expect missing translation keys
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const someEvent: AuditLogEvent = {
      ...logMockResponse.events[0]!,
      event: {
        // primitives
        number: 3,
        true: true,
        false: false,
        null: null,
        undefined: undefined,

        // translated
        role: "administrator",
        reference: "EntryNotFound",
        dataEntryStatus: "in_progress",
        level: "warning",

        // objects
        object: { value: 42 },
        array: [1, 2, 3],
        function: (x: number) => x + 1,
      },
    };

    render(<LogDetailsModal setDetails={() => {}} details={someEvent} />);

    expect(await screen.findByRole("heading", { level: 3, name: "Gebruiker ingelogd" })).toBeVisible();

    // Combine details key + value, ignoring initial default details
    const terms = screen.getAllByRole("term").slice(8);
    const definitions = screen.getAllByRole("definition").slice(8);
    const details = terms.map((term, i) => [term.textContent, definitions[i]!.textContent]);

    expect(details).toEqual([
      // primitives
      ["log.field.number", "3"],
      ["log.field.true", "Ja"],
      ["log.field.false", "Nee"],
      ["log.field.null", "-"],
      ["log.field.undefined", "-"],

      // translated
      ["Rol", "beheerder"],
      ["log.field.reference", "Niet gevonden"],
      ["log.field.dataEntryStatus", "Invoer bezig"],
      ["Type", "Waarschuwing"],

      // objects
      ["log.field.object", '{"value":42}'],
      ["log.field.array", "[1,2,3]"],
      ["log.field.function", "(x) => x + 1"],
    ]);
  });
});
