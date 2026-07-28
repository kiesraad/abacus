import type { Meta, StoryObj } from "@storybook/react-vite";

import { Alert } from "@/components/ui/Alert/Alert";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { resultsMockData } from "../testing/polling-station-results";
import type { CorrectEntry } from "../utils/differences";
import cls from "./ResolveDifferences.module.css";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

type Props = {
  correctEntry: CorrectEntry;
};

const correctEntries: CorrectEntry[] = ["first", "second", "neither"];
const first = resultsMockData(true);
const second = resultsMockData(false);
const structure = getDataEntryStructure("CSOFirstSession", electionMockData);

export const DefaultResolveDifferencesTables: StoryObj<Props> = {
  render: ({ correctEntry }) => {
    return (
      <main className={cls.resolveDifferences}>
        <Alert type="notify" small>
          <p>Previewing the result of a choice can be seen using the Controls below</p>
        </Alert>

        <ResolveDifferencesTables first={first} second={second} correctEntry={correctEntry} structure={structure} />
      </main>
    );
  },
};

export default {
  argTypes: {
    correctEntry: {
      options: correctEntries,
      control: { type: "radio" },
    },
  },
} satisfies Meta<Props>;
