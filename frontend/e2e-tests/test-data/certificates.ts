export type Certificate = {
  filename: string;
  path: string;
  electionName: string;
  electionDate: string;
  fingerprint: string;
};

export const certificate_0123_Heemdamseburg: Certificate = {
  filename: "0123_Heemdamseburg.crt",
  path: "e2e-tests/test-data/certificates/0123_Heemdamseburg.crt",
  electionName: "Waterschap Rivier en Polder 2023",
  electionDate: "woensdag 15 maart 2023",
  fingerprint: "2dd6c754d4fc655c0ba58ea7b0e1a7ab942e03f0b7ca20951b1af72d5516b6dc",
};

export const certificate_0123_Heemdamseburg_expired: Certificate = {
  filename: "0123_Heemdamseburg_expired.crt",
  path: "e2e-tests/test-data/certificates/0123_Heemdamseburg_expired.crt",
  electionName: "Waterschap Rivier en Polder 2023",
  electionDate: "woensdag 15 maart 2023",
  fingerprint: "d6c46e76aa367e05af71fb1d0c51a509c4f69c61991265a5b04118956298465c",
};
