export interface CompletionRequest {
  system: string;
  prompt: string;
  jsonSchemaName?: string;
}

export interface CompletionResponse {
  text: string;
  providerId: string;
}

export interface AIProvider {
  id: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
}
