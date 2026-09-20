export type AgentStreamEvent =
  | {
      type: "text";
      content: string;
    }
  | {
      type: "tool-start";
      toolName: string;
    }
  | {
      type: "tool-end";
      toolName: string;
      result?: string;
    };
