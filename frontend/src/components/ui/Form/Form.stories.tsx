import { FormEvent, useState } from "react";

import type { Meta, StoryFn } from "@storybook/react-vite";

import { Form } from "./Form";

export const DefaultForm: StoryFn = () => {
  const [formSubmitted, setFormSubmitted] = useState(false);

  function handleFormSubmit(event: FormEvent) {
    event.preventDefault();
    setFormSubmitted(true);
  }

  return (
    <>
      <div className="mb-lg">
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
      </div>
    </>
  );
};

export default {} satisfies Meta;
