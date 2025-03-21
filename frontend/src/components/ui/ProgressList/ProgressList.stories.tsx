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
        <ProgressList.Item status="accept">
          <span>Item 1</span>
        </ProgressList.Item>
        <ProgressList.Item status="accept">
          <span>Item 2</span>
        </ProgressList.Item>
        <ProgressList.Item status="accept">
          <span>Item 3</span>
        </ProgressList.Item>
      </ProgressList.Fixed>
      <ProgressList.Scroll>
        {Array.from({ length: 10 }).map((_, index) => (
          <ProgressList.Item key={index} status="idle" active={active === index}>
            <span>Scroll {index + 1}</span>
          </ProgressList.Item>
        ))}
      </ProgressList.Scroll>
      <ProgressList.Fixed>
        <ProgressList.Item status="idle">
          <span>Controleren en opslaan</span>
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
