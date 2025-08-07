import { AuditLogListResponse } from "@/types/generated/openapi";

export const logMockResponse: AuditLogListResponse = {
  events: [
    {
      id: 24,
      time: "2025-03-11T09:02:36Z",
      event: {
        event_type: "UserLoggedIn",
        user_agent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        logged_in_users_count: 0,
      },
      event_level: "success",
      user_id: 1,
      username: "admin",
      ip: "127.0.0.1",
      user_fullname: "Sanne Molenaar",
      user_role: "administrator",
    },
    {
      id: 23,
      time: "2025-03-11T09:02:35Z",
      event: {
        event_type: "UserLoggedOut",
        session_duration: 0,
      },
      event_level: "success",
      user_id: 1,
      username: "admin",
      ip: "127.0.0.1",
      user_fullname: "Sanne Molenaar",
      user_role: "administrator",
    },
    {
      id: 22,
      time: "2025-03-11T09:02:35Z",
      event: {
        event_type: "UserLoggedIn",
        user_agent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        logged_in_users_count: 0,
      },
      event_level: "success",
      user_id: 1,
      username: "admin",
      ip: "127.0.0.1",
      user_fullname: "Sanne Molenaar",
      user_role: "administrator",
    },
    {
      id: 21,
      time: "2025-03-11T09:02:34Z",
      event: {
        event_type: "UserLoggedOut",
        session_duration: 0,
      },
      event_level: "success",
      user_id: 2,
      username: "typist",
      ip: "127.0.0.1",
      user_fullname: "Sam Kuijpers",
      user_role: "typist",
    },
    {
      id: 20,
      time: "2025-03-11T09:02:33Z",
      event: {
        event_type: "UserLoggedIn",
        user_agent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        logged_in_users_count: 0,
      },
      event_level: "success",
      user_id: 2,
      username: "typist",
      ip: "127.0.0.1",
      user_fullname: "Sam Kuijpers",
      user_role: "typist",
    },
    {
      id: 19,
      time: "2025-03-11T09:02:33Z",
      event: {
        event_type: "UserLoggedOut",
        session_duration: 0,
      },
      event_level: "success",
      user_id: 3,
      username: "coordinator",
      ip: "127.0.0.1",
      user_fullname: "Mohammed van der Velden",
      user_role: "coordinator",
    },
    {
      id: 18,
      time: "2025-03-11T09:02:32Z",
      event: {
        event_type: "UserLoggedIn",
        user_agent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        logged_in_users_count: 0,
      },
      event_level: "success",
      user_id: 3,
      username: "coordinator",
      ip: "127.0.0.1",
      user_fullname: "Mohammed van der Velden",
      user_role: "coordinator",
    },
    {
      id: 17,
      time: "2025-03-11T09:02:31Z",
      event: {
        event_type: "UserLoggedOut",
        session_duration: 0,
      },
      event_level: "success",
      user_id: 3,
      username: "coordinator",
      ip: "127.0.0.1",
      user_fullname: "Mohammed van der Velden",
      user_role: "coordinator",
    },
  ],
  page: 1,
  pages: 3,
  per_page: 8,
};
