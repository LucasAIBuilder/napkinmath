import { useEffect, useRef, useState } from "react";

export type Sheet = {
  id: string;
  name: string;
  emoji: string;
  content: string;
  updatedAt: number;
};

type Props = {
  sheets: Sheet[];
  activeSheetId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onEmoji: (id: string, emoji: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
};

function formatTimestamp(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export default function SheetSelector(props: Props) {
  const {
    sheets,
    activeSheetId,
    onSelect,
    onNew,
    onRename,
    onDelete,
    onEmoji,
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
  } = props;

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const longPressRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  // Active sheet is indicated in the list via the accent highlight.

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenu(null);
        setMobileOpen(false);
        setRenamingId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setMobileOpen]);

  function openMenu(id: string, x: number, y: number) {
    setMenu({ id, x, y });
    setRenamingId(null);
  }

  const Sidebar = (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--nm-bg-gutter)", borderRight: "1px solid var(--nm-border-subtle)" }}
      onClick={() => setMenu(null)}
    >
      <div className={collapsed ? "relative px-2 py-2" : "flex items-center justify-between px-3 py-2"}>
        {!collapsed ? (
          <>
            <div className="min-w-0">
              <div className="text-xs font-semibold tracking-wide" style={{ color: "var(--nm-text-muted)" }}>
                My Sheets
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* mobile toggle */}
              <button
                type="button"
                className="nm-btn inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm sm:hidden"
                style={{ borderColor: "var(--nm-border)", color: "var(--nm-text-muted)" }}
                onClick={() => setMobileOpen(false)}
                aria-label="Close sheets"
              >
                ✕
              </button>

              <button
                type="button"
                className="nm-btn hidden h-8 w-8 items-center justify-center rounded-md border text-sm sm:inline-flex"
                style={{ borderColor: "var(--nm-border)", color: "var(--nm-text-muted)" }}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sheets" : "Collapse sheets"}
              >
                {collapsed ? "☰" : "⟨"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="pt-9 flex justify-center">
              <div
                className="text-xs font-semibold tracking-wide whitespace-nowrap -rotate-90 origin-center"
                style={{ color: "var(--nm-text-muted)" }}
              >
                My Sheets
              </div>
            </div>

            <div className="absolute right-2 top-2 flex items-center gap-1">
              {/* mobile toggle */}
              <button
                type="button"
                className="nm-btn inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm sm:hidden"
                style={{ borderColor: "var(--nm-border)", color: "var(--nm-text-muted)" }}
                onClick={() => setMobileOpen(false)}
                aria-label="Close sheets"
              >
                ✕
              </button>

              <button
                type="button"
                className="nm-btn hidden h-8 w-8 items-center justify-center rounded-md border text-sm sm:inline-flex"
                style={{ borderColor: "var(--nm-border)", color: "var(--nm-text-muted)" }}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sheets" : "Collapse sheets"}
              >
                {collapsed ? "☰" : "⟨"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className={"min-h-0 flex-1 overflow-auto " + (collapsed ? "px-2" : "px-2") + " py-1"}>
        {sheets.map((s) => {
          const isActive = s.id === activeSheetId;
          const isRenaming = renamingId === s.id;
          return (
            <div
              key={s.id}
              className={
                "group mb-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2" +
                (isActive ? "" : " hover:bg-black/5")
              }
              style={{
                background: isActive ? "var(--nm-accent)" : "transparent",
                color: isActive ? "#fff" : "var(--nm-text)",
              }}
              onClick={() => {
                if (longPressFiredRef.current) {
                  longPressFiredRef.current = false;
                  return;
                }
                onSelect(s.id);
                setMobileOpen(false);
              }}
              onDoubleClick={() => {
                if (collapsed) return;
                setRenamingId(s.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                openMenu(s.id, e.clientX, e.clientY);
              }}
              onPointerDown={(e) => {
                if (e.pointerType !== "touch") return;
                longPressFiredRef.current = false;
                if (longPressRef.current) window.clearTimeout(longPressRef.current);
                longPressRef.current = window.setTimeout(() => {
                  longPressFiredRef.current = true;
                  openMenu(s.id, e.clientX, e.clientY);
                }, 520);
              }}
              onPointerUp={() => {
                if (longPressRef.current) window.clearTimeout(longPressRef.current);
                longPressRef.current = null;
              }}
              onPointerCancel={() => {
                if (longPressRef.current) window.clearTimeout(longPressRef.current);
                longPressRef.current = null;
              }}
            >
              <div className="w-6 text-center text-base">{s.emoji || "📄"}</div>

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  {isRenaming ? (
                    <input
                      autoFocus
                      defaultValue={s.name}
                      className="nm-ios-nozoom w-full rounded-md border bg-transparent px-2 py-1 text-sm outline-none"
                      style={{ borderColor: isActive ? "rgba(255,255,255,0.45)" : "var(--nm-border)" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.currentTarget as HTMLInputElement).blur();
                        }
                        if (e.key === "Escape") {
                          setRenamingId(null);
                        }
                      }}
                      onBlur={(e) => {
                        const next = e.currentTarget.value.trim() || "Untitled";
                        onRename(s.id, next);
                        setRenamingId(null);
                      }}
                    />
                  ) : (
                    <div className="truncate text-sm font-medium">{s.name}</div>
                  )}
                  <div
                    className="text-xs"
                    style={{ color: isActive ? "rgba(255,255,255,0.75)" : "var(--nm-text-faint)" }}
                  >
                    {formatTimestamp(s.updatedAt)}
                  </div>
                </div>
              )}

              {!collapsed && (
                <button
                  type="button"
                  className="nm-btn hidden h-7 w-7 items-center justify-center rounded-md border text-xs group-hover:inline-flex"
                  style={{
                    borderColor: isActive ? "rgba(255,255,255,0.35)" : "var(--nm-border)",
                    color: isActive ? "#fff" : "var(--nm-text-muted)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openMenu(s.id, (e as any).clientX ?? 0, (e as any).clientY ?? 0);
                  }}
                  aria-label="Sheet actions"
                >
                  ⋯
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-2">
        <button
          type="button"
          onClick={() => {
            onNew();
            setMobileOpen(false);
          }}
          className="nm-btn inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium"
          style={{ borderColor: "var(--nm-border)", color: "var(--nm-text)" }}
        >
          <span>＋</span>
          {!collapsed && <span>New</span>}
        </button>
      </div>

      {menu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu(null);
          }}
        >
          <div
            className="absolute min-w-44 rounded-lg border p-1 shadow-lg"
            style={{
              left: Math.max(8, menu.x - 8),
              top: Math.max(8, menu.y - 8),
              background: "var(--nm-bg-card)",
              borderColor: "var(--nm-border)",
              color: "var(--nm-text)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="nm-btn flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-black/5"
              onClick={() => {
                setMenu(null);
                setRenamingId(menu.id);
              }}
            >
              Rename
            </button>
            <button
              type="button"
              className="nm-btn flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-black/5"
              onClick={() => {
                const cur = sheets.find((s) => s.id === menu.id);
                const next = window.prompt("Emoji", cur?.emoji ?? "")?.trim();
                if (next) onEmoji(menu.id, next);
                setMenu(null);
              }}
            >
              Emoji
            </button>
            <button
              type="button"
              className="nm-btn flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-black/5"
              style={{ color: "var(--nm-syn-error)" }}
              onClick={() => {
                const cur = sheets.find((s) => s.id === menu.id);
                const ok = window.confirm(
                  cur?.content?.trim()
                    ? `Delete “${cur.name}”? This sheet has content.`
                    : `Delete “${cur?.name ?? "sheet"}”?`,
                );
                if (ok) onDelete(menu.id);
                setMenu(null);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Desktop sidebar is inline; mobile uses drawer overlay
  return (
    <>
      <div className={"hidden h-full sm:block " + (collapsed ? "w-14" : "w-[220px]")}>{Sidebar}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.35)" }}
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[260px] shadow-xl">{Sidebar}</div>
        </div>
      )}

    </>
  );
}
