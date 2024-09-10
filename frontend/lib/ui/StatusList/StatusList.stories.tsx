import type { Story } from "@ladle/react";

import { StatusList } from "./StatusList";

/** Story stub for form */

export const DefaultStatusList: Story = () => (
  <StatusList>
    <StatusList.Item status="accept">Accepted</StatusList.Item>
    <StatusList.Item status="warning">Warning</StatusList.Item>
    <StatusList.Item status="empty">Empty</StatusList.Item>
    <StatusList.Item status="error">Empty</StatusList.Item>
    <StatusList.Item status="accept" emphasis>
      With Emphasis
    </StatusList.Item>
  </StatusList>
);
