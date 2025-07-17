import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";

import { IconPlus } from "@/components/generated/icons";

import { Button } from "../Button/Button";
import { Toolbar } from "./Toolbar";

type Props = {
  pos: "start" | "center" | "end";
};
export const BasicToolbar: StoryObj<Props> = {
  args: {
    pos: "end",
  },
  render: ({ pos }) => (
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
  ),
};

export const ExampleToolbar: StoryFn = () => (
  <Toolbar id="example-toolbar">
    <Toolbar.Section pos="start">
      <Button variant="secondary" size="sm">
        Toolbar button
      </Button>
    </Toolbar.Section>
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
      options: ["start", "center", "end"],
      control: { type: "radio" },
    },
  },
} satisfies Meta<Props>;
