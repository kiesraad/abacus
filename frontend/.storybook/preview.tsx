import { StaticRouter } from "react-router";

import type { Preview } from "@storybook/react-vite";
import { configure, expect, sb } from "storybook/test";

import { ApiResponseStatus } from "@/api/ApiResult";
import { ElectionProviderContext } from "@/hooks/election/ElectionProviderContext";
import { ElectionStatusProviderContext } from "@/hooks/election/ElectionStatusProviderContext";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import { UsersProviderContext } from "@/hooks/user/UsersProviderContext";
import { t } from "@/i18n/translate";
import "@/styles/index.css";
import { electionDetailsMockResponse } from "@/testing/api-mocks/ElectionMockData";
import { statusResponseMock } from "@/testing/api-mocks/ElectionStatusMockData";
import { userMockData } from "@/testing/api-mocks/UserMockData";
import { matchers } from "@/testing/matchers";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { Role } from "@/types/generated/openapi";

sb.mock("react-router", { spy: true });

const preview: Preview = {
  beforeAll: () => {
    configure({
      testIdAttribute: "id",
    });
    expect.extend(matchers);
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      options: {
        dark: { name: "Dark", value: "#333" },
        light: { name: "Light", value: "#f9fafb" },
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: "light" },
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
      const needsElectionStatus = (parameters.needsElectionStatus as boolean) || false;
      const committeeSessionNumber = (parameters.committeeSessionNumber as number) || 1;

      let component = <Story />;

      if (needsElectionStatus) {
        component = (
          <ElectionStatusProviderContext.Provider
            value={{
              statuses: statusResponseMock.statuses,
              refetch: () =>
                Promise.resolve({ status: ApiResponseStatus.Success, code: 200, data: statusResponseMock }),
            }}
          >
            {component}
          </ElectionStatusProviderContext.Provider>
        );
      }

      if (needsElection) {
        component = (
          <ElectionProviderContext.Provider
            value={{
              election: electionDetailsMockResponse.election,
              pollingStations: electionDetailsMockResponse.polling_stations,
              currentCommitteeSession: {
                ...electionDetailsMockResponse.current_committee_session,
                number: committeeSessionNumber,
              },
              committeeSessions: electionDetailsMockResponse.committee_sessions,
              investigations: electionDetailsMockResponse.investigations,
              refetch: () =>
                Promise.resolve({ status: ApiResponseStatus.Success, code: 200, data: electionDetailsMockResponse }),
            }}
          >
            {component}
          </ElectionProviderContext.Provider>
        );
      }

      return component;
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
    // Messages Provider decorator
    (Story, { parameters }) => {
      const needsMessages = (parameters.needsMessages as boolean) || false;

      const component = <Story />;

      if (needsMessages) {
        return <MessagesProvider>{component}</MessagesProvider>;
      }

      return component;
    },
  ],
};

export default preview;
