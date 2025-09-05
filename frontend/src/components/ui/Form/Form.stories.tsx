import { FormEvent, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { Form } from "./Form";

export interface StoryProps {
  title?: string;
}

export default {
  args: {
    title: "Form title",
  },
  argTypes: {
    title: {
      options: ["Form title", undefined],
      control: { type: "radio" },
    },
  },
} satisfies Meta<StoryProps>;

export const DefaultForm: StoryObj<StoryProps> = {
  render: ({ title }) => {
    const [formSubmitted, setFormSubmitted] = useState(false);

    function handleFormSubmit(event: FormEvent) {
      event.preventDefault();
      setFormSubmitted(true);
    }

    return (
      <>
        <div className="mb-lg">
          <Form title={title} onSubmit={handleFormSubmit}>
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
  },
};
