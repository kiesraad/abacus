import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { ProgressList } from "./ProgressList";

const style: CSSProperties = {
  height: 480,
  width: 300,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
};

const meta = {} satisfies Meta;
export default meta;

type Props = {
  active: number;
};

export const DefaultProgressList: StoryObj<Props> = {
  args: {
    active: 0,
  },
  argTypes: {
    active: {
      control: {
        type: "number",
        min: 0,
        max: 9,
      },
    },
  },
  render: ({ active }) => (
    <div style={style}>
      <ProgressList>
        <ProgressList.Fixed>
          <ProgressList.Item status="accept" id="accept-item">
            <span>Item 1 - accept</span>
          </ProgressList.Item>
          <ProgressList.Item status="accept" active={true} id="active-accept-item">
            <span>Item 2 - active and accept</span>
          </ProgressList.Item>
          <ProgressList.Item status="error" id="error-item">
            <span>Item 3 - error</span>
          </ProgressList.Item>
          <ProgressList.Item status="warning" id="warning-item">
            <span>Item 4 - warning</span>
          </ProgressList.Item>
          <ProgressList.Item status="unsaved" id="unsaved-item">
            <span>Item 5 - unsaved</span>
          </ProgressList.Item>
          <ProgressList.Item status="empty" id="empty-item">
            <span>Item 6 - empty</span>
          </ProgressList.Item>
          <ProgressList.Item status="idle" id="idle-item">
            <span>Item 7 - idle</span>
          </ProgressList.Item>
        </ProgressList.Fixed>

        <ProgressList.Scroll>
          {Array.from({ length: 10 }).map((_, index) => (
            <ProgressList.Item key={index} status="idle" active={active === index} id={`scroll-item-${index + 1}`}>
              <span>Scroll {index + 1}</span>
            </ProgressList.Item>
          ))}
        </ProgressList.Scroll>

        <ProgressList.Fixed>
          <ProgressList.Item status="idle" id="idle-disabled-item" disabled={true}>
            <span>Item 11 - idle and disabled</span>
          </ProgressList.Item>
        </ProgressList.Fixed>
      </ProgressList>
    </div>
  ),
};

export const OverviewProgressList: StoryObj = {
  render: function Render() {
    const structure = getDataEntryStructure("CSOFirstSession", electionMockData);
    return (
      <ProgressList>
        <ProgressList.Fixed>
          {structure.map((section, i) => (
            <ProgressList.OverviewItem
              key={section.id}
              status={i === 1 || i === 4 ? "warning" : "idle"}
              addSpace={section.id === "political_group_votes_1"}
            >
              <span>{section.short_title}</span>
            </ProgressList.OverviewItem>
          ))}
        </ProgressList.Fixed>
      </ProgressList>
    );
  },
};
