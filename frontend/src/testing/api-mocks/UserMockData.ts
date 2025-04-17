import { LoginResponse, User } from "@/types/generated/openapi";

const today = new Date();
today.setHours(10, 20);

const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

const created_at = new Date().toISOString();
const updated_at = new Date().toISOString();

export const userMockData: User[] = [
  {
    id: 1,
    username: "Sanne",
    role: "administrator",
    fullname: "Sanne Molenaar",
    last_activity_at: today.toISOString(),
    created_at,
    updated_at,
  },
  {
    id: 2,
    username: "Jayden",
    role: "coordinator",
    fullname: "Jayden Ahmen",
    last_activity_at: yesterday.toISOString(),
    created_at,
    updated_at,
  },
  {
    id: 3,
    username: "Gebruiker01",
    role: "typist",
    created_at,
    updated_at,
  },
  {
    id: 4,
    username: "Gebruiker02",
    role: "typist",
    created_at,
    updated_at,
  },
  {
    id: 5,
    username: "Gebruiker03",
    role: "typist",
    created_at,
    updated_at,
  },
];

export const loginResponseMockData: LoginResponse = {
  user_id: 1,
  username: "Sanne",
  role: "administrator",
  fullname: "Sanne Molenaar",
  needs_password_change: false,
};
