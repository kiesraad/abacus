declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_MODE: "mock" | "local";
      API_HOST: string;
      VERSION: string;
    }
  }
}
