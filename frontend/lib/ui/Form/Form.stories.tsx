import type { Story } from "@ladle/react";

import { Form } from "./Form";

export const DefaultForm: Story = () => (
  <Form title="Form title">
    <input id="inp1" />
    <br />
    <input id="inp2" />
    <br />
    <input id="inp3" />
    <br />
    <button type="submit">Submit</button>
  </Form>
);
