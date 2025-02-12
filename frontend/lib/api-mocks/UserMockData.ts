import { User } from "@kiesraad/api";

const today = new Date();
today.setHours(10, 20);

const laterToday = new Date();
laterToday.setHours(13, 37);

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
    last_activity_at: laterToday.toISOString(),
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
