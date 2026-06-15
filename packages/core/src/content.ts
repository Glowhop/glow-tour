export type PrimitiveValue = string | number | boolean | null;

export interface TextContent {
  kind: "text";
  text: string;
  meta?: Record<string, PrimitiveValue>;
}

export interface CustomContent {
  kind: "custom";
  id: string;
  data?: Record<string, PrimitiveValue>;
}

export type ContentValue = string | TextContent | CustomContent;
