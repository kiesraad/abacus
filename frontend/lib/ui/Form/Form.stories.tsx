import type { Story } from "@ladle/react";

import { Form } from "./Form";

/** Story stub for form */

export const DefaultForm: Story = () => (
  <Form>
    <input id="inp1" />
    <br />
    <input id="inp2" />
    <br />
    <input id="inp3" />
    <br />
    <button type="submit">Submit</button>
  </Form>
);
