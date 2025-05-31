import { Story } from "@ladle/react";

import { Alert } from "@/components/ui/Alert/Alert";
import { politicalGroupsMockData } from "@/testing/api-mocks/ElectionMockData";
import { ResolveDifferencesAction } from "@/types/generated/openapi";

import { pollingStationResultsMockData } from "../testing/polling-station-results";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

type Props = {
  action: ResolveDifferencesAction;
};

const actions: ResolveDifferencesAction[] = ["keep_first_entry", "keep_second_entry", "discard_both_entries"];

export default {
  title: "App / Resolve Differences",
  argTypes: {
    action: {
      options: actions,
      control: { type: "radio" },
    },
  },
};

export const DefaultResolveDifferencesTables: Story<Props> = ({ action }) => {
  return (
    <>
      <Alert type="notify" small>
        <p>Previewing the result of an action can be seen using the Controls below</p>
      </Alert>

      <ResolveDifferencesTables
        first={pollingStationResultsMockData(true)}
        second={pollingStationResultsMockData(false)}
        action={action}
        politicalGroups={politicalGroupsMockData}
      />
    </>
  );
};

DefaultResolveDifferencesTables.storyName = "ResolveDifferencesTables";
