import type { Certificate, SubCommittee } from "@/types/generated/openapi";

export const getCertificateMockData = (certificate: Partial<Certificate> = {}): Certificate => {
  return {
    election_identifier: "PS2027_Noord-Holland",
    organizational_unit: "Abacus 1.2.0",
    common_name: "Gemeente Aalsmeer",
    not_before: "2026-01-01T00:00:00Z",
    not_after: "2027-04-01T00:00:00Z",
    signature_algorithm: "RSA 4096-bit",
    public_key: "-----BEGIN PUBLIC KEY-----\n-----END PUBLIC KEY-----\n",
    public_key_fingerprint: "a4ac04ce062498ce950a4b02d6fc5bb1dea3f74b209ae6f6e7251e626252b8e1",
    ...certificate,
  };
};

export const getSubCommitteeMockData = (subCommittee: Partial<SubCommittee> = {}): SubCommittee => {
  return {
    id: 1,
    number: 1,
    name: "Aalsmeer",
    category: "GSB",
    authority_id: "0358",
    authority_name: "Aalsmeer",
    certificates: [],
    ...subCommittee,
  };
};

export const pendingSubCommitteesMockData: SubCommittee[] = [
  getSubCommitteeMockData({ id: 1, number: 1, name: "Aalsmeer", authority_id: "0358", authority_name: "Aalsmeer" }),
  getSubCommitteeMockData({ id: 2, number: 2, name: "Amstelveen", authority_id: "0362", authority_name: "Amstelveen" }),
  getSubCommitteeMockData({ id: 3, number: 3, name: "Beverwijk", authority_id: "0375", authority_name: "Beverwijk" }),
  getSubCommitteeMockData({ id: 4, number: 4, name: "Blaricum", authority_id: "0376", authority_name: "Blaricum" }),
];

export const importedSubCommitteesMockData: SubCommittee[] = [
  getSubCommitteeMockData({
    id: 5,
    number: 5,
    name: "Haarlem",
    authority_id: "0392",
    authority_name: "Haarlem",
    certificates: [getCertificateMockData({ common_name: "Gemeente Haarlem" })],
  }),
  getSubCommitteeMockData({
    id: 6,
    number: 6,
    name: "Bloemendaal",
    authority_id: "0377",
    authority_name: "Bloemendaal",
    certificates: [getCertificateMockData({ common_name: "Gemeente Bloemendaal" })],
  }),
  getSubCommitteeMockData({
    id: 7,
    number: 7,
    name: "Gooise Meren",
    authority_id: "1942",
    authority_name: "Gooise Meren",
    certificates: Array.from({ length: 4 }, () => getCertificateMockData({ common_name: "Gemeente Gooise Meren" })),
  }),
  getSubCommitteeMockData({
    id: 8,
    number: 8,
    name: "Diemen",
    authority_id: "0384",
    authority_name: "Diemen",
    certificates: Array.from({ length: 2 }, () => getCertificateMockData({ common_name: "Gemeente Diemen" })),
  }),
];

export const subCommitteesMockData: SubCommittee[] = [
  ...importedSubCommitteesMockData,
  ...pendingSubCommitteesMockData,
];
