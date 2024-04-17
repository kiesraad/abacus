declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VERSION: string;
    }
  }
}
