import * as React from "react";

import type { Story } from "@ladle/react";

import { t } from "@/lib/i18n";
import { politicalGroupsMockData } from "@/testing/api-mocks/ElectionMockData";

import { ProgressList } from "./ProgressList";

const style: React.CSSProperties = {
  height: 480,
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
);

const sections = ["recounted", "voters_votes_counts", "differences_counts"] as const;

export const OverviewProgressList: Story = () => (
  <ProgressList>
    <ProgressList.Fixed>
      {sections.map((section, i) => (
        <ProgressList.OverviewItem
          key={section}
          status={i === 1 ? "warning" : "idle"}
          addSpace={i === sections.length - 1}
        >
          <span>{t(`resolve_differences.section_short.${section}`)}</span>
        </ProgressList.OverviewItem>
      ))}
      {politicalGroupsMockData.map((pg) => (
        <ProgressList.OverviewItem key={pg.number} status={pg.number === 2 ? "warning" : "idle"}>
          <span>
            {t("list")} {pg.number} - {pg.name}
          </span>
        </ProgressList.OverviewItem>
      ))}
    </ProgressList.Fixed>
  </ProgressList>
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
