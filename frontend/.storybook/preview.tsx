import { StaticRouter } from "react-router";

import type { Preview } from "@storybook/react-vite";

import "@/styles/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    // make things using react-router work
    (Story) => (
      <StaticRouter location="/">
        <Story />
      </StaticRouter>
    ),
  ],
};

export default preview;
