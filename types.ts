
export enum GenerationState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface GenerativePart {
  mimeType: string;
  data: string; // base64 encoded string
}

export interface ExamplePrompt {
  prompt: string;
  imageUrl: string;
}

export interface PromptCategory {
  title: string;
  prompts: ExamplePrompt[];
}
