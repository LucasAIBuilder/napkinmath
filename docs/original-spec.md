# NapkinMath: original design document

The spec the first version was built from. The app has moved on since (sheets, currencies, a browser extension, different shortcuts); the [README](../README.md) describes it as it is now.

> A notepad calculator for Linux. Type math in plain English, get answers instantly.

Inspired by [Soulver](https://soulver.app/) for Mac.

## Concept

A single-page web app. The UI is a notepad where each line is an expression. Results appear aligned on the right side of each line, updated live as you type.

## Tech Stack

- **TypeScript** + **React** (via [Vite](https://vite.dev/))
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components (theme toggle, buttons, etc.)
- **math.js** for expression parsing, variables, and unit conversions
- **localStorage** for persistence — no backend, no accounts
- Dev server runs on **port 3003** (`vite.config.ts` must set `server.port: 3003`)

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  NapkinMath                                [≡] [◑]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  rent = 1500                           $1,500.00  │
│  utilities = 200                         $200.00  │
│  groceries = 400                         $400.00  │
│                                                     │
│  # Monthly expenses                                 │
│  rent + utilities + groceries          $2,100.00  │
│  total * 12                           $25,200.00  │
│                                                     │
│  salary = 85000                       $85,000.00  │
│  salary - total * 12                  $59,800.00  │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Left side: editable text, one expression per line
- Right side: computed results, right-aligned, styled subtly (muted color)
- Blank lines and comment lines (`#` or `//`) show no result
- Active line has a subtle highlight
- Results update on every keystroke (debounced ~50ms)

## Core Features

### 1. Basic Arithmetic
```
10 + 5                          → 15
100 - 30                        → 70
25 * 4                          → 100
144 / 12                        → 12
2 ^ 8                           → 256
(10 + 5) * 3                    → 45
```

### 2. Percentages
```
25% of 200                      → 50
200 + 10%                       → 220
200 - 15%                       → 170
what is 33% of 600              → 198
```

Percentage parsing rules:
- `X% of Y` → `Y * X/100`
- `Y + X%` → `Y * (1 + X/100)`
- `Y - X%` → `Y * (1 - X/100)`

### 3. Variables
```
price = 49.99                   → 49.99
tax = 8.5%
price + tax% of price           → 54.24
```

Variables are defined with `=` and available to all subsequent lines. Variable names are case-insensitive, alphanumeric + underscores.

### 4. Line References
The special variable `previous` (or `prev`) refers to the result of the preceding non-empty line. Optionally support `line1`, `line2`, etc.

```
1500                            → 1,500
previous * 12                   → 18,000
```

### 5. Labels / Comments
Lines starting with `#` or `//` are comments and produce no result. They act as section headers.

```
# Monthly Budget
rent = 2000                     → 2,000
...
```

### 6. Totals
The keyword `total` on a line sums all uncommented results above it (or since the last `total`).

```
100                             → 100
200                             → 200
350                             → 350
total                           → 650
```

### 7. Unit Conversions
Leverage math.js built-in unit support:

```
150 kg to lbs                   → 330.69 lbs
5 miles to km                   → 8.05 km
72 fahrenheit to celsius        → 22.22 °C
2 hours + 30 minutes            → 2.5 hours
```

### 8. Number Formatting
- Results are formatted with thousands separators: `1,500.00`
- Currency prefix ($) shown when the user uses `$` in input
- Reasonable decimal places (2 for currency, up to 6 for other)
- Large numbers use abbreviations optionally: `1.5M`

## UI Details

### Theming
- Default: dark theme (easy on the eyes for a utility app)
- Toggle for light theme via shadcn/ui theme toggle
- Store preference in localStorage

### Typography
- Monospace font for the editor (e.g., JetBrains Mono, Fira Code, or system monospace)
- Clean sans-serif for the header/chrome

### Syntax Highlighting
Apply subtle color coding in the input area:
- **Numbers**: white/primary
- **Operators**: muted/gray
- **Variables** (when defined): accent color (blue/teal)
- **Keywords** (`total`, `of`, `to`, `in`): secondary accent
- **Comments** (`#`, `//`): dim/italic

### Responsive Behavior
- Minimum viable width: ~400px
- Results column has a fixed width (~150px), input area takes remaining space
- Scrollable if lines exceed viewport

### Keyboard Shortcuts
- `Ctrl+L` — clear all
- `Ctrl+S` — save to localStorage (also auto-saves on change)
- `Ctrl+D` — duplicate current line
- `Ctrl+/` — toggle comment on current line

### Persistence
- Auto-save editor content to localStorage on every change
- Load saved content on page open
- Simple — no files, no accounts, no cloud

## Technical Architecture

### Project Structure
```
napkinmath/
├── src/
│   ├── components/
│   │   ├── Editor.tsx          # Main notepad editor component
│   │   ├── ResultLine.tsx      # Individual result display
│   │   ├── ThemeToggle.tsx     # Dark/light mode toggle
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── engine.ts           # Math evaluation engine
│   │   ├── preprocessor.ts     # Natural language → math.js expressions
│   │   └── formatter.ts        # Number/result formatting
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # Entry point
│   └── index.css               # Tailwind imports + custom styles
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
├── SPEC.md
└── README.md
```

### Dependencies
- **react**, **react-dom** — UI rendering
- **mathjs** — expression parsing, unit conversions, variable scope
- **tailwindcss** — utility-first styling
- **shadcn/ui** — pre-built accessible components
- **vite** — dev server and build tool

### Parsing Pipeline (per line)

```
Input line
  → Preprocess (handle "% of", "total", "previous", comments)
  → Evaluate via math.js (with variable scope)
  → Format result
  → Render via React
```

1. **Preprocess** (`preprocessor.ts`): Transform natural language patterns into math.js-compatible expressions
   - `X% of Y` → `(X/100) * Y`
   - `Y + X%` → `Y * (1 + X/100)`
   - `Y - X%` → `Y * (1 - X/100)`
   - `total` → sum of results since last total
   - `previous` / `prev` → substitute last result value
   - Strip `$` and `,` from number inputs
   - Convert `to`/`in` to math.js unit syntax if needed
2. **Evaluate** (`engine.ts`): Pass to `math.evaluate()` with a persistent scope object
3. **Format** (`formatter.ts`): Apply number formatting based on context
4. **Render**: React updates the result column for the corresponding input line

### State Management
- React state via `useState` / `useReducer`
- `lines: string[]` — array of raw input strings
- `results: (number | string | null)[]` — array of computed results
- `scope: object` — math.js variable scope, rebuilt on every full evaluation pass
- Evaluate all lines top-to-bottom on any change (simple, fast enough for hundreds of lines)

### Error Handling
- Invalid expressions show no result (blank right side), not an error message
- Optionally show a subtle red underline on lines with parse errors
- Never block typing or show modal errors

## Non-Goals (v1)

These are explicitly out of scope for the first version:
- Currency conversion (requires live API)
- Stock prices
- Date/time math ("3 weeks from today")
- Multiple sheets/tabs
- Export to file
- Undo/redo beyond browser default
- Mobile optimization
- Collaborative editing

## Nice-to-Have (v1.1+)

- Export as plain text or markdown
- Multiple sheets/tabs
- Currency conversion via free API (frankfurter.app)
- Date math with day.js
- Shareable URLs (encode state in hash)
- PWA support (offline, installable)
- Cmd palette for unit lookups
