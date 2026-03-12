import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { DataEntryContext } from "@/features/data_entry/hooks/DataEntryContext";
import type { DataEntryStateAndActionsLoaded } from "@/features/data_entry/types/types";
import { TestUserProvider } from "@/testing/TestUserProvider";
import type { DataEntrySource, DataEntryStatusName } from "@/types/generated/openapi";
import { DataEntryHeader } from "./DataEntryHeader";

type Props = {
  sourceType: DataEntrySource["type"];
  sourceNumber: DataEntrySource["number"];
  sourceName: DataEntrySource["name"];
  dataEntryStatus: DataEntryStatusName;
};

export const PollingStation: StoryObj<Props> = {
  args: {
    sourceType: "PollingStation",
    sourceNumber: 33,
    sourceName: "Op Rolletjes",
    dataEntryStatus: "first_entry_in_progress",
  },
  argTypes: {
    sourceType: {
      options: ["PollingStation", "SubCommittee"],
      control: { type: "radio" },
    },
    dataEntryStatus: {
      options: ["first_entry_in_progress", "first_entry_finalised"],
      control: { type: "radio" },
    },
  },
  parameters: {
    needsElection: true,
  },
  render: (args) => {
    const state = {
      source: {
        type: args.sourceType,
        number: args.sourceNumber,
        name: args.sourceName,
      },
      dataEntryStatus: args.dataEntryStatus,
    } as DataEntryStateAndActionsLoaded;

    return (
      <TestUserProvider userRole="typist_gsb">
        <DataEntryContext.Provider value={state}>
          <div className="bg-white">
            <AppLayout>
              <DataEntryHeader />
            </AppLayout>
          </div>
        </DataEntryContext.Provider>
      </TestUserProvider>
    );
  },
  play: async ({ canvas }) => {
    const headerInfo = canvas.getByRole("banner");
    await expect(headerInfo).toHaveTextContent("33" + "Op Rolletjes" + "1e invoer" + "Invoer afbreken");
  },
};

export const SubCommittee: StoryObj<Props> = {
  ...PollingStation,
  args: {
    sourceType: "SubCommittee",
    sourceNumber: 1,
    sourceName: "Hilversum",
    dataEntryStatus: "first_entry_finalised",
  },
  play: async ({ canvas }) => {
    const headerInfo = canvas.getByRole("banner");
    await expect(headerInfo).toHaveTextContent("1" + "Hilversum" + "2e invoer" + "Invoer afbreken");
  },
};

export default {};
