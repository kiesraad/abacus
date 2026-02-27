import type { Meta, StoryFn } from "@storybook/react-vite";

import type { DisplayFraction as DisplayFractionType } from "@/types/generated/openapi";

import { DisplayFraction } from "./DisplayFraction";

export const DefaultDisplayFractions: StoryFn = () => (
  <>
    <DisplayFraction
      id="fraction1"
      fraction={{ integer: 10000, numerator: 149, denominator: 150 } as DisplayFractionType}
    />
    <DisplayFraction
      id="fraction2"
      fraction={{ integer: 1234, numerator: 20, denominator: 150 } as DisplayFractionType}
    />
    <DisplayFraction id="fraction3" fraction={{ integer: 0, numerator: 34, denominator: 150 } as DisplayFractionType} />
    <DisplayFraction id="fraction4" fraction={{ integer: 1, numerator: 0, denominator: 1 } as DisplayFractionType} />
    <DisplayFraction id="fraction5" fraction={{ integer: 0, numerator: 0, denominator: 1 } as DisplayFractionType} />
  </>
);

export default {} satisfies Meta;
