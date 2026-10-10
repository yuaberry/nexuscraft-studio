/**
 * Minecraft MOTD parsing — legacy § codes and modern chat components
 * rendered as styled parts for the import preview. Pure, fully tested.
 */

export interface MotdPart {
  text: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  obfuscated: boolean;
}

/** Named Minecraft colors → CSS hex. */
export const MC_COLORS: Record<string, string> = {
  "0": "#000000",
  black: "#000000",
  "1": "#0000AA",
  dark_blue: "#0000AA",
  "2": "#00AA00",
  dark_green: "#00AA00",
  "3": "#00AAAA",
  dark_aqua: "#00AAAA",
  "4": "#AA0000",
  dark_red: "#AA0000",
  "5": "#AA00AA",
  dark_purple: "#AA00AA",
  "6": "#FFAA00",
  gold: "#FFAA00",
  "7": "#AAAAAA",
  gray: "#AAAAAA",
  "8": "#555555",
  dark_gray: "#555555",
  "9": "#5555FF",
  blue: "#5555FF",
  a: "#55FF55",
  green: "#55FF55",
  b: "#55FFFF",
  aqua: "#55FFFF",
  c: "#FF5555",
  red: "#FF5555",
  d: "#FF55FF",
  light_purple: "#FF55FF",
  e: "#FFFF55",
  yellow: "#FFFF55",
  f: "#FFFFFF",
  white: "#FFFFFF",
};

const DEFAULT_COLOR = "#8a93a6";

function basePart(): MotdPart {
  return {
    text: "",
    color: DEFAULT_COLOR,
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    obfuscated: false,
  };
}

/** Parses a legacy MOTD string (§ color/format codes). */
export function parseLegacyMotd(raw: string): MotdPart[] {
  const parts: MotdPart[] = [];
  let current = basePart();

  // Text accumulated under the CURRENT style belongs to that style:
  // flush it before any state change (this is how the game renders it).
  const flush = () => {
    if (current.text) {
      parts.push(current);
      current = { ...current, text: "" };
    }
  };

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "§" && i + 1 < raw.length) {
      const code = raw[i + 1].toLowerCase();
      i++;
      if (code === "r") {
        flush();
        current = basePart();
        continue;
      }
      const color = MC_COLORS[code];
      if (color) {
        flush();
        current = { ...current, color }; // color change keeps formats (game behavior)
        continue;
      }
      if (code === "k") {
        flush();
        current = { ...current, obfuscated: true };
      } else if (code === "l") {
        flush();
        current = { ...current, bold: true };
      } else if (code === "m") {
        flush();
        current = { ...current, strikethrough: true };
      } else if (code === "n") {
        flush();
        current = { ...current, underline: true };
      } else if (code === "o") {
        flush();
        current = { ...current, italic: true };
      } else if (code === "x") {
        // §x§R§R§G§G§B§B hex form
        flush();
        let hex = "#";
        for (let k = 0; k < 6 && i + 2 < raw.length; k++) {
          hex += raw[i + 2];
          i += 2;
        }
        current = { ...basePart(), color: hex };
      }
      continue;
    }
    current.text += ch;
  }
  flush();
  return parts.length > 0 ? parts : [basePart()];
}

interface ChatComponent {
  text?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
  extra?: ChatComponent[];
}

/** Parses a modern chat component (object form of the description). */
export function parseComponentMotd(value: unknown): MotdPart[] {
  const parts: MotdPart[] = [];

  const walk = (node: unknown, inherited: MotdPart) => {
    if (typeof node === "string") {
      if (node) parts.push({ ...inherited, text: node });
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) walk(child, inherited);
      return;
    }
    if (typeof node !== "object" || node === null) return;
    const comp = node as ChatComponent;
    const next: MotdPart = { ...inherited };
    if (typeof comp.color === "string") {
      next.color = MC_COLORS[comp.color.toLowerCase()] ?? comp.color;
    }
    if (comp.bold === true) next.bold = true;
    if (comp.italic === true) next.italic = true;
    if (comp.underlined === true) next.underline = true;
    if (comp.strikethrough === true) next.strikethrough = true;
    if (comp.obfuscated === true) next.obfuscated = true;
    if (typeof comp.text === "string" && comp.text) {
      parts.push({ ...next, text: comp.text });
    }
    if (Array.isArray(comp.extra)) {
      for (const child of comp.extra) walk(child, next);
    }
  };

  walk(value, basePart());
  return parts.length > 0 ? parts : [basePart()];
}

/** Accepts whatever the server sent (legacy string or component tree). */
export function parseMotd(description: unknown): MotdPart[] {
  if (typeof description === "string") return parseLegacyMotd(description);
  if (description && typeof description === "object") {
    return parseComponentMotd(description);
  }
  return [basePart()];
}
