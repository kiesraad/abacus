import type { Story } from "@ladle/react";

import { Form } from "./Form";

/** Story stub for form */

export const DefaultForm: Story = () => (
  <Form>
    <input id="test1" />
    <input id="test2" />
    <button type="submit" />
  </Form>
);
