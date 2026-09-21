export type AgentStreamEvent =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "tool-start";
      toolName: string;
      toolCallId: string;
      input: unknown;
    }
  | {
      type: "tool-end";
      toolName: string;
      toolCallId: string;
      result?: string;
    };
