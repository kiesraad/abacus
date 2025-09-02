import type { Meta, StoryFn } from "@storybook/react-vite";

import { ResolveErrorsOverview } from "@/features/resolve_errors/components/ResolveErrorsOverview";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { ValidationResults } from "@/types/generated/openapi";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

const structure = getDataEntryStructure("CSOFirstSession", electionMockData);
const results: ValidationResults = {
  errors: [validationResultMockData.F201, validationResultMockData.F401],
  warnings: [validationResultMockData.W201, validationResultMockData.W001],
};

export const ResolveErrorsOverviewStory: StoryFn = () => (
  <ResolveErrorsOverview structure={structure} results={results} />
);

export default {} satisfies Meta;
