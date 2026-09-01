/** What the side panel is currently showing detail for. */
export type Selection =
  | { kind: 'node'; id: string }
  | { kind: 'community'; id: string }
  | null
