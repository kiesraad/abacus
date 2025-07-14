import { FormEvent, useState } from "react";

import type { Meta, StoryFn } from "@storybook/react-vite";

import { Form } from "@/components/ui/Form/Form";

import { useFormKeyboardNavigation } from "../hooks/useFormKeyboardNavigation";

export const FormKeyboardNavigation: StoryFn = () => {
  const ref = useFormKeyboardNavigation();

  const [keyboardFormSubmitted, setKeyboardFormSubmitted] = useState(false);

  function handleKeyboardFormSubmit(event: FormEvent) {
    event.preventDefault();
    setKeyboardFormSubmitted(true);
  }

  return (
    <>
      <div className="mb-lg">
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
      </div>
    </>
  );
};

export default {} satisfies Meta;
