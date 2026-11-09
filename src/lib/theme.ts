export const SCHEME_NAMES = ["stationery", "midnight", "verdant", "rosewood", "phosphor"] as const;
export type SchemeName = (typeof SCHEME_NAMES)[number];
export type ThemeMode = "light" | "dark";

/** The resolved data-theme attribute value */
export type ThemeKey = string;

const SCHEME_KEY = "napkinmath:scheme:v3";
const MODE_KEY = "napkinmath:mode:v3";

export function getStoredScheme(): SchemeName | null {
  const value = localStorage.getItem(SCHEME_KEY);
  if (SCHEME_NAMES.includes(value as SchemeName)) return value as SchemeName;
  return null;
}

export function getStoredMode(): ThemeMode | null {
  const value = localStorage.getItem(MODE_KEY);
  if (value === "light" || value === "dark") return value;
  return null;
}

export function setStoredScheme(scheme: SchemeName) {
  localStorage.setItem(SCHEME_KEY, scheme);
}

export function setStoredMode(mode: ThemeMode) {
  localStorage.setItem(MODE_KEY, mode);
}

export function resolveThemeKey(scheme: SchemeName, mode: ThemeMode): ThemeKey {
  const info = SCHEME_MAP[scheme];
  // If the requested mode matches the scheme's "native" mode, use the base key
  if (info.nativeMode === mode) return scheme;
  // Otherwise use the variant key
  return `${scheme}-${mode}`;
}

export function applyTheme(scheme: SchemeName, mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", resolveThemeKey(scheme, mode));
}

export type SchemeColors = {
  bg: string;
  card: string;
  gutter: string;
  text: string;
  muted: string;
  accent: string;
  result: string;
  keyword: string;
  variable: string;
  comment: string;
  border: string;
};

export type SchemeInfo = {
  id: SchemeName;
  label: string;
  subtitle: string;
  nativeMode: ThemeMode;
  light: SchemeColors;
  dark: SchemeColors;
};

export const SCHEME_INFO: SchemeInfo[] = [
  {
    id: "stationery",
    label: "Stationery",
    subtitle: "Warm cream & ink",
    nativeMode: "light",
    light: {
      bg: "#f5f0e8",
      card: "#faf7f2",
      gutter: "#f0ebe2",
      text: "#2c2416",
      muted: "#8c7e6a",
      accent: "#c8956c",
      result: "#9e6b3a",
      keyword: "#7c6542",
      variable: "#3d7a6a",
      comment: "#b3a694",
      border: "#e0d8cc",
    },
    dark: {
      bg: "#1a1610",
      card: "#211c14",
      gutter: "#1d1812",
      text: "#ddd5c8",
      muted: "#8c7e6a",
      accent: "#c8956c",
      result: "#d4a468",
      keyword: "#c8956c",
      variable: "#5cb8a4",
      comment: "#4a4030",
      border: "#342c20",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    subtitle: "Cool blue & amber",
    nativeMode: "dark",
    light: {
      bg: "#edf0f4",
      card: "#f5f7fa",
      gutter: "#e8ecf2",
      text: "#1a2030",
      muted: "#6878a0",
      accent: "#c4804a",
      result: "#b06830",
      keyword: "#c4804a",
      variable: "#2e8874",
      comment: "#a0a8b8",
      border: "#d0d8e4",
    },
    dark: {
      bg: "#161a1f",
      card: "#1c2128",
      gutter: "#191e24",
      text: "#d4dae3",
      muted: "#7a8594",
      accent: "#d4976a",
      result: "#d4976a",
      keyword: "#d4976a",
      variable: "#6cb6a0",
      comment: "#4a5568",
      border: "#2e353e",
    },
  },
  {
    id: "verdant",
    label: "Verdant",
    subtitle: "Moss & fern",
    nativeMode: "dark",
    light: {
      bg: "#eef3ec",
      card: "#f5f9f3",
      gutter: "#e8efe6",
      text: "#142010",
      muted: "#5a7850",
      accent: "#5a8e38",
      result: "#4a7c2c",
      keyword: "#4a7c2c",
      variable: "#b89840",
      comment: "#9cb094",
      border: "#d0dcc8",
    },
    dark: {
      bg: "#111c15",
      card: "#16241a",
      gutter: "#131f17",
      text: "#c8d8c4",
      muted: "#6e9468",
      accent: "#7baa54",
      result: "#a4cc78",
      keyword: "#a4cc78",
      variable: "#e0c06c",
      comment: "#3e5e3a",
      border: "#253830",
    },
  },
  {
    id: "rosewood",
    label: "Rosewood",
    subtitle: "Blush & porcelain",
    nativeMode: "light",
    light: {
      bg: "#f3eced",
      card: "#faf5f6",
      gutter: "#eee6e8",
      text: "#30181f",
      muted: "#8a6070",
      accent: "#b86880",
      result: "#a8586e",
      keyword: "#a8586e",
      variable: "#387868",
      comment: "#b89aa4",
      border: "#ddd0d4",
    },
    dark: {
      bg: "#1c1318",
      card: "#24181e",
      gutter: "#1f151b",
      text: "#e0ccd4",
      muted: "#8a6070",
      accent: "#c87090",
      result: "#d87898",
      keyword: "#c87090",
      variable: "#58b8a0",
      comment: "#4a3040",
      border: "#3c2830",
    },
  },
  {
    id: "phosphor",
    label: "Phosphor",
    subtitle: "CRT terminal",
    nativeMode: "dark",
    light: {
      bg: "#ecf4ec",
      card: "#f4faf4",
      gutter: "#e6f0e6",
      text: "#0a2810",
      muted: "#308040",
      accent: "#1c8830",
      result: "#1a7828",
      keyword: "#1a7828",
      variable: "#187880",
      comment: "#88b890",
      border: "#c4dcc8",
    },
    dark: {
      bg: "#080c08",
      card: "#0c120c",
      gutter: "#0a0e0a",
      text: "#38e850",
      muted: "#1ca830",
      accent: "#28c040",
      result: "#30d848",
      keyword: "#38e850",
      variable: "#20c8d0",
      comment: "#0e6818",
      border: "#162816",
    },
  },
];

export const SCHEME_MAP: Record<SchemeName, SchemeInfo> = Object.fromEntries(
  SCHEME_INFO.map((s) => [s.id, s]),
) as Record<SchemeName, SchemeInfo>;

export function getColorsForMode(scheme: SchemeName, mode: ThemeMode): SchemeColors {
  return SCHEME_MAP[scheme][mode];
}
