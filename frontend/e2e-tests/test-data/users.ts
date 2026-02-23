import type { Role } from "@/types/generated/openapi";

export type TestUser = {
  username: string;
  fullname: string;
  role: Role;
};

export const firstAdmin: TestUser = {
  username: "admin1",
  fullname: "Sanne Molenaar",
  role: "administrator",
};

export const testUsers: TestUser[] = [
  {
    username: "admin2",
    fullname: "Jef van Reybrouck",
    role: "administrator",
  },
  {
    username: "coordinator1",
    fullname: "Mohammed van der Velden",
    role: "coordinator_gsb",
  },
  {
    username: "coordinator2",
    fullname: "Mei Chen",
    role: "coordinator_gsb",
  },
  {
    username: "typist1",
    fullname: "Sam Kuijpers",
    role: "typist_gsb",
  },
  {
    username: "typist2",
    fullname: "Aliyah van den Berg",
    role: "typist_gsb",
  },
];
