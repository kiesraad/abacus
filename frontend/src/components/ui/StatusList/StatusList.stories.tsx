import type { Meta, StoryFn } from "@storybook/react-vite";

import { StatusList } from "./StatusList";

export const DefaultStatusList: StoryFn = () => (
  <StatusList>
    <StatusList.Item status="accept">Accepted</StatusList.Item>
    <StatusList.Item status="active" emphasis>
      Active with Emphasis
    </StatusList.Item>
    <StatusList.Item status="empty">Empty</StatusList.Item>
    <StatusList.Item status="error">Error</StatusList.Item>
    <StatusList.Item status="idle">Idle</StatusList.Item>
    <StatusList.Item status="unsaved">Unsaved</StatusList.Item>
    <StatusList.Item status="warning">
      Warning <a href="about:blank">Link</a> with text
    </StatusList.Item>
  </StatusList>
);

export default {} satisfies Meta;
