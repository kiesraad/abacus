import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/components/ui/Badge/*.stories.@(js|jsx|mjs|ts|tsx)", "../src/components/ui/Button/*.stories.tsx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-onboarding"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};
export default config;
