export interface WikiLink {
  /** Text exactly as written, e.g. `![[Spectral Gap#Definition|gap]]`. */
  raw: string;
  /** Note or file name/path, e.g. `Spectral Gap` or `Assets/mass-gap.png`. */
  target: string;
  heading?: string;
  block?: string;
  alias?: string;
  /** `![[…]]` rather than `[[…]]`. */
  embed: boolean;
  /** 1-based line number in the source file (for validation messages). */
  line: number;
}

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export interface Note {
  /** Vault-relative path without extension, forward slashes. */
  id: string;
  /** Absolute file path on disk. */
  file: string;
  /** File basename without extension — what `[[wikilinks]]` usually refer to. */
  name: string;
  /** URL path (no leading slash), derived from folders + name. */
  slug: string;
  folders: string[];
  /** Top-level folder, used by the Library. */
  section: string;
  title: string;
  aliases: string[];
  /** Display tags, without `#`. */
  tags: string[];
  status?: string;
  type?: string;
  description?: string;
  created?: Date;
  updated?: Date;
  frontmatter: Record<string, unknown>;
  /** Markdown body with frontmatter removed. */
  body: string;
  /** Number of lines the frontmatter occupied (to report correct line numbers). */
  bodyLineOffset: number;
  headings: Heading[];
  links: WikiLink[];
  /** Plain-text rendering used for excerpts and search. */
  text: string;
  excerpt: string;
}

export interface Asset {
  /** Vault-relative path, forward slashes. */
  id: string;
  name: string;
  file: string;
  /** Public URL (base path included). */
  url: string;
}

export interface BibEntry {
  key: string;
  type: string;
  fields: Record<string, string>;
}

export interface GraphNode {
  id: string;
  title: string;
  slug: string;
  section: string;
  group: string;
  degree: number;
  tags: string[];
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface Graph {
  nodes: GraphNode[];
  links: GraphLink[];
}
