import type { Role } from "@/types/generated/openapi";

export type testUser = {
  username: string;
  fullname: string;
  role: Role;
};

export const firstAdmin: testUser = {
  username: "admin1",
  fullname: "Sanne Molenaar",
  role: "administrator",
};

export const testUsers: testUser[] = [
  {
    username: "admin2",
    fullname: "Jef van Reybrouck",
    role: "administrator",
  },
  {
    username: "coordinator1",
    fullname: "Mohammed van der Velden",
    role: "coordinator",
  },
  {
    username: "coordinator2",
    fullname: "Mei Chen",
    role: "coordinator",
  },
  {
    username: "typist1",
    fullname: "Sam Kuijpers",
    role: "typist",
  },
  {
    username: "typist2",
    fullname: "Aliyah van den Berg",
    role: "typist",
  },
];
