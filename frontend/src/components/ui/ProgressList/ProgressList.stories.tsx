import * as React from "react";

import type { Story } from "@ladle/react";

import { ProgressList } from "./ProgressList";

const style: React.CSSProperties = {
  height: 400,
  width: 300,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
};

type Props = {
  active: number;
};

export const DefaultProgressList: Story<Props> = ({ active }) => (
  <div style={style}>
    <ProgressList>
      <ProgressList.Fixed>
        <ProgressList.Item status="accept" id="accept-item">
          <span>Item 1 - accept</span>
        </ProgressList.Item>
        <ProgressList.Item status="error" id="error-item">
          <span>Item 2 - error</span>
        </ProgressList.Item>
        <ProgressList.Item status="warning" id="warning-item">
          <span>Item 3 - warning</span>
        </ProgressList.Item>
        <ProgressList.Item status="unsaved" id="unsaved-item">
          <span>Item 4 - unsaved</span>
        </ProgressList.Item>
        <ProgressList.Item status="empty" id="empty-item">
          <span>Item 5 - empty</span>
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
        <ProgressList.Item status="idle" id="idle-item">
          <span>Controleren en opslaan - idle</span>
        </ProgressList.Item>
      </ProgressList.Fixed>
    </ProgressList>
  </div>
);

DefaultProgressList.argTypes = {
  active: {
    defaultValue: 0,
    control: {
      type: "number",
      min: 0,
      max: 9,
    },
  },
};
