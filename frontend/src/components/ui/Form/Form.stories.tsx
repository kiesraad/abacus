import { FormEvent, useState } from "react";

import type { Story } from "@ladle/react";

import { useFormKeyboardNavigation } from "@kiesraad/ui";

import { Form } from "./Form";

export const DefaultForm: Story = () => {
  const [formSubmitted, setFormSubmitted] = useState(false);

  function handleFormSubmit(event: FormEvent) {
    event.preventDefault();
    setFormSubmitted(true);
  }

  return (
    <>
      <p className="mb-lg">
        <Form title="Form" onSubmit={handleFormSubmit}>
          <input id="inp1" />
          <br />
          <input id="inp2" />
          <br />
          <input id="inp3" />
          <br />
          <button type="submit">Submit</button>
        </Form>
        {formSubmitted && "Submitted!"}
      </p>
    </>
  );
};

export const UseFormKeyboardNavigation: Story = () => {
  const ref = useFormKeyboardNavigation();

  const [keyboardFormSubmitted, setKeyboardFormSubmitted] = useState(false);

  function handleKeyboardFormSubmit(event: FormEvent) {
    event.preventDefault();
    setKeyboardFormSubmitted(true);
  }

  return (
    <>
      <p className="mb-lg">
        <Form title="Form with keyboard interaction" ref={ref} onSubmit={handleKeyboardFormSubmit}>
          <input id="inp1" />
          <br />
          <input id="inp2" />
          <br />
          <input id="inp3" />
          <br />
          <button type="submit">Submit</button>
        </Form>
        {keyboardFormSubmitted && "Submitted!"}
      </p>
    </>
  );
};
