import { AuditLogListResponse } from "@/types/generated/openapi";

export const logMockResponse: AuditLogListResponse = {
  events: [
    {
      id: 24,
      time: "2025-03-11T09:02:36Z",
      event: {
        eventType: "UserLoggedIn",
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        loggedInUsersCount: 0,
      },
      eventLevel: "success",
      userId: 1,
      username: "admin",
      ip: "127.0.0.1",
      userFullname: "Sanne Molenaar",
      userRole: "administrator",
    },
    {
      id: 23,
      time: "2025-03-11T09:02:35Z",
      event: {
        eventType: "UserLoggedOut",
        sessionDuration: 0,
      },
      eventLevel: "success",
      userId: 1,
      username: "admin",
      ip: "127.0.0.1",
      userFullname: "Sanne Molenaar",
      userRole: "administrator",
    },
    {
      id: 22,
      time: "2025-03-11T09:02:35Z",
      event: {
        eventType: "UserLoggedIn",
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        loggedInUsersCount: 0,
      },
      eventLevel: "success",
      userId: 1,
      username: "admin",
      ip: "127.0.0.1",
      userFullname: "Sanne Molenaar",
      userRole: "administrator",
    },
    {
      id: 21,
      time: "2025-03-11T09:02:34Z",
      event: {
        eventType: "UserLoggedOut",
        sessionDuration: 0,
      },
      eventLevel: "success",
      userId: 2,
      username: "typist",
      ip: "127.0.0.1",
      userFullname: "Sam Kuijpers",
      userRole: "typist",
    },
    {
      id: 20,
      time: "2025-03-11T09:02:33Z",
      event: {
        eventType: "UserLoggedIn",
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        loggedInUsersCount: 0,
      },
      eventLevel: "success",
      userId: 2,
      username: "typist",
      ip: "127.0.0.1",
      userFullname: "Sam Kuijpers",
      userRole: "typist",
    },
    {
      id: 19,
      time: "2025-03-11T09:02:33Z",
      event: {
        eventType: "UserLoggedOut",
        sessionDuration: 0,
      },
      eventLevel: "success",
      userId: 3,
      username: "coordinator",
      ip: "127.0.0.1",
      userFullname: "Mohammed van der Velden",
      userRole: "coordinator",
    },
    {
      id: 18,
      time: "2025-03-11T09:02:32Z",
      event: {
        eventType: "UserLoggedIn",
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        loggedInUsersCount: 0,
      },
      eventLevel: "success",
      userId: 3,
      username: "coordinator",
      ip: "127.0.0.1",
      userFullname: "Mohammed van der Velden",
      userRole: "coordinator",
    },
    {
      id: 17,
      time: "2025-03-11T09:02:31Z",
      event: {
        eventType: "UserLoggedOut",
        sessionDuration: 0,
      },
      eventLevel: "success",
      userId: 3,
      username: "coordinator",
      ip: "127.0.0.1",
      userFullname: "Mohammed van der Velden",
      userRole: "coordinator",
    },
  ],
  page: 1,
  pages: 3,
  perPage: 8,
};
