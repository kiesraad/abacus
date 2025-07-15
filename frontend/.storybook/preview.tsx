import { StaticRouter } from "react-router";

import type { Preview } from "@storybook/react-vite";

import { ApiResponseStatus } from "@/api/ApiResult";
import { ElectionProviderContext } from "@/hooks/election/ElectionProviderContext";
import { UsersProviderContext } from "@/hooks/user/UsersProviderContext";
import { t } from "@/i18n/translate";
import "@/styles/index.css";
import { electionDetailsMockResponse } from "@/testing/api-mocks/ElectionMockData";
import { userMockData } from "@/testing/api-mocks/UserMockData";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { ElectionWithPoliticalGroups, PollingStation, Role } from "@/types/generated/openapi";

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
    // Router decorator - make things using react-router work
    (Story, context) => {
      const location = (context.parameters.location as string) || "/";
      return (
        <StaticRouter location={location}>
          <Story />
        </StaticRouter>
      );
    },
    // Election Provider decorator - provide mock election context if needed
    (Story, { parameters }) => {
      const needsElection = (parameters.needsElection as boolean) || false;
      const election = parameters.election as ElectionWithPoliticalGroups | undefined;
      const pollingStations = parameters.pollingStations as PollingStation[] | undefined;

      if (!needsElection) {
        return <Story />;
      }

      return (
        <ElectionProviderContext.Provider
          value={{
            election: election ?? electionDetailsMockResponse.election,
            pollingStations: pollingStations ?? electionDetailsMockResponse.polling_stations,
            committeeSession: electionDetailsMockResponse.committee_session,
            refetch: () =>
              Promise.resolve({ status: ApiResponseStatus.Success, code: 200, data: electionDetailsMockResponse }),
          }}
        >
          <Story />
        </ElectionProviderContext.Provider>
      );
    },
    // Users Provider decorator - provide mock users context if needed
    (Story, { parameters }) => {
      const needsUsers = (parameters.needsUsers as boolean) || false;

      if (!needsUsers) {
        return <Story />;
      }

      function getName(userId?: number, fallback = t("user")) {
        if (userId === undefined) {
          return fallback;
        }

        const user = userMockData.find(({ id }) => userId === id);
        return user?.fullname ?? user?.username ?? fallback;
      }

      return (
        <UsersProviderContext.Provider value={{ users: userMockData, getName }}>
          <Story />
        </UsersProviderContext.Provider>
      );
    },
    // Test User Provider decorator - provide mock user context
    (Story, { parameters }) => {
      const userRole = (parameters.userRole as Role | null) || null;
      const expiration = parameters.expiration as Date | undefined;

      return (
        <TestUserProvider userRole={userRole} overrideExpiration={expiration}>
          <Story />
        </TestUserProvider>
      );
    },
  ],
};

export default preview;
