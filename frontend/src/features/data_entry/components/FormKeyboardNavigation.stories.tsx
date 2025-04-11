import { FormEvent, useState } from "react";

import type { Story } from "@ladle/react";

import { Form } from "@/components/ui/Form/Form";

import { useFormKeyboardNavigation } from "../hooks/useFormKeyboardNavigation";

export const FormKeyboardNavigation: Story = () => {
  const ref = useFormKeyboardNavigation();

  const [keyboardFormSubmitted, setKeyboardFormSubmitted] = useState(false);

  function handleKeyboardFormSubmit(event: FormEvent) {
    event.preventDefault();
    setKeyboardFormSubmitted(true);
  }

  return (
    <>
      <p className="mb-lg">
        <Form title="Form with keyboard navigation" ref={ref} onSubmit={handleKeyboardFormSubmit}>
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
