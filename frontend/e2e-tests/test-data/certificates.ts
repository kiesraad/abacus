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
  fingerprint: "91c2c35664b41d91681237d8bbe886b070720d87f532c67729173bf79be20ea3",
};

export const certificate_0123_Heemdamseburg_expired: Certificate = {
  filename: "0123_Heemdamseburg_expired.crt",
  path: "e2e-tests/test-data/certificates/0123_Heemdamseburg_expired.crt",
  electionName: "Waterschap Rivier en Polder 2023",
  electionDate: "woensdag 15 maart 2023",
  fingerprint: "d6c46e76aa367e05af71fb1d0c51a509c4f69c61991265a5b04118956298465c",
};
