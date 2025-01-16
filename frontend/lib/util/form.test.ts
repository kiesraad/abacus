import { describe, expect, test } from "vitest";

import { AnyFormField, FieldValue, FormFields, processForm, ValidationError } from "@kiesraad/util";

type ExpectedError = ValidationError | undefined;
type ExpectedValue = string | number | undefined;

describe("Form", () => {
  test.each<[AnyFormField, string, ExpectedError, ExpectedValue]>([
    // String valid
    [{ type: "string" }, "test", undefined, "test"],

    // String required
    [{ type: "string", required: true }, "", "FORM_VALIDATION_RESULT_REQUIRED", undefined],
    [{ type: "string", required: false }, "", undefined, ""],

    // String minLength/maxLength
    [{ type: "string", minLength: 10 }, "test", "FORM_VALIDATION_RESULT_MIN_LENGTH", undefined],
    [{ type: "string", minLength: 2 }, "test", undefined, "test"],
    [{ type: "string", maxLength: 3 }, "test", "FORM_VALIDATION_RESULT_MAX_LENGTH", undefined],
    [{ type: "string", maxLength: 255 }, "test", undefined, "test"],

    // String Undefined
    [{ type: "string", mapUndefined: true }, "test", undefined, "test"],
    [{ type: "string", mapUndefined: true }, "Undefined", undefined, undefined],
    [{ type: "string", mapUndefined: false }, "Undefined", undefined, "Undefined"],
    [{ type: "string", mapUndefined: true }, "", undefined, ""],

    // Number valid
    [{ type: "number" }, "5", undefined, 5],
    [{ type: "number" }, "-5", undefined, -5],
    [{ type: "number" }, "005", undefined, 5],
    [{ type: "number" }, "5.005", "FORM_VALIDATION_RESULT_INVALID_NUMBER", undefined],
    [{ type: "number" }, "x", "FORM_VALIDATION_RESULT_INVALID_NUMBER", undefined],
    [{ type: "number" }, "12a", "FORM_VALIDATION_RESULT_INVALID_NUMBER", undefined],
    [{ type: "number" }, "12,3", "FORM_VALIDATION_RESULT_INVALID_NUMBER", undefined],

    // Number required
    [{ type: "number", required: true }, "", "FORM_VALIDATION_RESULT_REQUIRED", undefined],
    // FIXME in issue #824 [{ type: "number", required: false }, "", undefined, undefined],

    // Number min/max
    [{ type: "number", min: 3 }, "2", "FORM_VALIDATION_RESULT_MIN", undefined],
    [{ type: "number", min: 1 }, "2", undefined, 2],
    [{ type: "number", max: 3 }, "4", "FORM_VALIDATION_RESULT_MAX", undefined],
    [{ type: "number", max: 5 }, "4", undefined, 4],

    // Number isFormatted valid
    [{ type: "number", isFormatted: true }, "5", undefined, 5],
    [{ type: "number", isFormatted: true }, "-5", undefined, -5],
    [{ type: "number", isFormatted: true }, "005", undefined, 5],
    [{ type: "number", isFormatted: true }, "5.005", undefined, 5005],
    [{ type: "number", isFormatted: true }, "x", "FORM_VALIDATION_RESULT_INVALID_NUMBER", undefined],

    // Number isFormatted required
    [{ type: "number", isFormatted: true, required: true }, "", "FORM_VALIDATION_RESULT_REQUIRED", undefined],
    // FIXME in issue #824 [{ type: "number", isFormatted: true , required: false }, "", undefined, undefined],
  ])("processForm for field type %j with input %j should return %j, %j", (field, inputValue, error, value) => {
    type RequestObject = { field: FieldValue<typeof field> };
    const formFields: FormFields<RequestObject> = { field };

    const input = document.createElement("input");
    input.name = "field";
    input.value = inputValue;

    const { isValid, validationResult, requestObject } = processForm<RequestObject>(formFields, { field: input });

    expect(validationResult.field, "validationResult").toBe(error);
    expect(requestObject.field, "requestObject").toBe(value);
    expect(isValid, "isValid").toBe(!error);
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
    nameInput.value = " ";

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
