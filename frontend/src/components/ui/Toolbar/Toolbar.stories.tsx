import { Story } from "@ladle/react";

import { IconPlus } from "@kiesraad/icon";
import { Button } from "@kiesraad/ui";

import { Toolbar, ToolbarSection } from "./Toolbar";

type Props = {
  pos: "start" | "center" | "end";
};
export const BasicToolbar: Story<Props> = ({ pos }) => (
  <Toolbar id="basic-toolbar">
    <Toolbar.Section pos={pos}>
      <Button leftIcon={<IconPlus />} variant="secondary" size="sm" id="button1">
        Lijst exporteren
      </Button>
      <Button leftIcon={<IconPlus />} variant="secondary" size="sm" id="button2">
        Stembureau toevoegen
      </Button>
    </Toolbar.Section>
  </Toolbar>
);

export const ExampleToolbar: Story = () => (
  <Toolbar id="example-toolbar">
    <ToolbarSection pos="start">
      <Button variant="secondary" size="sm">
        Toolbar button
      </Button>
    </ToolbarSection>
    <Toolbar.Section pos="end">
      <Button leftIcon={<IconPlus />} variant="secondary" size="sm">
        Lijst exporteren
      </Button>
      <Button leftIcon={<IconPlus />} variant="secondary" size="sm">
        Stembureau toevoegen
      </Button>
    </Toolbar.Section>
  </Toolbar>
);

export default {
  argTypes: {
    pos: {
      defaultValue: "end",
      options: ["start", "center", "end"],
      control: { type: "radio" },
    },
  },
};
