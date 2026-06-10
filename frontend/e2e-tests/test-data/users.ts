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
    username: "coordinator1-GSB",
    fullname: "Mohammed van der Velden",
    role: "coordinator_gsb",
  },
  {
    username: "coordinator2-GSB",
    fullname: "Mei Chen",
    role: "coordinator_gsb",
  },
  {
    username: "typist1-GSB",
    fullname: "Sam Kuijpers",
    role: "typist_gsb",
  },
  {
    username: "typist2-GSB",
    fullname: "Aliyah van den Berg",
    role: "typist_gsb",
  },
];

export const testUsersCSB: TestUser[] = [
  {
    username: "coordinator1-CSB",
    fullname: "Tinus Bakker",
    role: "coordinator_csb",
  },
  {
    username: "coordinator2-CSB",
    fullname: "Molly Li",
    role: "coordinator_csb",
  },
  {
    username: "typist1-CSB",
    fullname: "Fatima Muhammad",
    role: "typist_csb",
  },
  {
    username: "typist2-CSB",
    fullname: "Jordy van Houten",
    role: "typist_csb",
  },
];
