interface Window {
  aistudio?: {
    openSelectKey: () => Promise<void>;
    hasSelectedApiKey: () => Promise<boolean>;
  };
}

declare namespace NodeJS {
  interface ProcessEnv {
    GEMINI_API_KEY: string;
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};
