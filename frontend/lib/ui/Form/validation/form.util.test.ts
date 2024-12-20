import { describe, expect, test } from "vitest";

import { AnyFormField, FormFields, processForm, validateFormValue, ValidationError } from "./form.util";

describe("Form Utils", () => {
  test.each<[AnyFormField, string | number, ValidationError | null]>([
    [{ type: "string" }, "test", null],
    [{ type: "string", minLength: 10 }, "test", "FORM_VALIDATION_RESULT_MIN_LENGTH"],
    [{ type: "string", maxLength: 3 }, "test", "FORM_VALIDATION_RESULT_MAX_LENGTH"],
    [{ type: "number" }, 5, null],
    [{ type: "number" }, "x", "FORM_VALIDATION_RESULT_INVALID_TYPE"],
    [{ type: "number", min: 3 }, 2, "FORM_VALIDATION_RESULT_MIN"],
    [{ type: "number", max: 3 }, 4, "FORM_VALIDATION_RESULT_MAX"],
  ])("validateFormValue for field type %j with input '%s' should return %j", (field, value, expected) => {
    const result = validateFormValue(field, value);
    expect(result).toBe(expected);
  });

  test("Process form, success", () => {
    type RequestObject = {
      name: string;
      number: number;
    };

    const fields: FormFields<RequestObject> = {
      name: { type: "string", required: true },
      number: { type: "number", required: true },
    };

    const nameInput = document.createElement("input");
    nameInput.name = "name";
    nameInput.value = "Polling station A";

    const numberInput = document.createElement("input");
    numberInput.name = "number";
    numberInput.value = "17";

    const { isValid, requestObject } = processForm<RequestObject>(fields, { name: nameInput, number: numberInput });
    expect(isValid).toBe(true);
    expect(requestObject).toEqual({ name: "Polling station A", number: 17 });
  });

  test("Process form, validation errors", () => {
    type RequestObject = {
      name: string;
      number: number;
    };

    const fields: FormFields<RequestObject> = {
      name: { type: "string", required: true },
      number: { type: "number", required: true },
    };

    const nameInput = document.createElement("input");
    nameInput.name = "name";
    nameInput.value = "";

    const numberInput = document.createElement("input");
    numberInput.name = "number";
    numberInput.value = "1a";

    const { isValid, validationResult } = processForm<RequestObject>(fields, { name: nameInput, number: numberInput });
    expect(isValid).toBe(false);
    expect(validationResult).toEqual({
      name: "FORM_VALIDATION_RESULT_REQUIRED",
      number: "FORM_VALIDATION_RESULT_INVALID_NUMBER",
    });
  });
});
