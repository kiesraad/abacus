import type { Story } from "@ladle/react";

import { ResolveErrorsOverview } from "@/features/resolve_errors/components/ResolveErrorsOverview";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { ValidationResults } from "@/types/generated/openapi";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

export default {
  title: "App / Resolve Errors",
};

const structure = getDataEntryStructure(electionMockData);
const results: ValidationResults = {
  errors: [validationResultMockData.F201, validationResultMockData.F401],
  warnings: [validationResultMockData.W201, validationResultMockData.W001],
};

export const ResolveErrorsOverviewStory: Story = () => (
  <ResolveErrorsOverview structure={structure} results={results} />
);

ResolveErrorsOverviewStory.storyName = "ResolveErrorsOverview";
