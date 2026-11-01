import { useEffect, useState, type Dispatch, type JSX, type SetStateAction } from "react";
import { LayoutGrid, Library, Loader2, Plus, Trash2 } from "lucide-react";
import type { ExtensionConfig } from "../../types";
import { ExtensionCatalog } from "./ExtensionCatalog";
import { ExtIcon } from "./ExtIcon";
import {
  type CatalogExtension,
  type EssentialExtension,
  HUSH_ESSENTIAL_EXTENSIONS,
} from "../../data/extensionCatalog";

/**
 * Per-profile extensions manager, shared by the create + edit sheets.
 *
 * Two modes:
 *  - Live (edit, or any saved profile): `profileId` is set -> installs/toggles/
 *    removes hit the backend for that profile immediately.
 *  - Staging (create): `profileId` is null and `onStagedChange` is provided ->
 *    the section operates on an in-memory list. Installs unpack into the shared
 *    store (via `prepare*`, no profile yet) and the parent passes the staged
 *    list to `profiles.create({ extensions })`.
 */
export function ExtensionsSection({
  profileId,
  staged,
  onStagedChange,
}: {
  profileId: string | null;
  staged?: ExtensionConfig[];
  onStagedChange?: Dispatch<SetStateAction<ExtensionConfig[]>>;
}): JSX.Element {
  if (!profileId) {
    if (onStagedChange) {
      return <StagingExtensions staged={staged ?? []} onChange={onStagedChange} />;
    }
    return (
      <div className="text-[12px] text-slate-500 leading-relaxed">
        Сначала сохраните профиль — затем вы сможете добавлять расширения (.crx / .zip / папка или по ссылке Chrome Web Store).
      </div>
    );
  }
  return <LiveExtensions profileId={profileId} />;
}

// ─── Live mode (edit / saved profile) ─────────────────────────────────────

function LiveExtensions({ profileId }: { profileId: string }): JSX.Element {
  const [items, setItems] = useState<ExtensionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogBusyId, setCatalogBusyId] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [available, setAvailable] = useState<ExtensionConfig[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.multizen.extensions
      .list(profileId)
      .then((res) => {
        if (!cancelled) {
          setItems(res);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  async function run(fn: () => Promise<ExtensionConfig[]>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setItems(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openAttach(): Promise<void> {
    setShowAttach((v) => !v);
    if (available === null) {
      try {
        setAvailable(await window.multizen.extensions.storeEntries());
      } catch {
        setAvailable([]);
      }
    }
  }

  async function installFromCatalog(ext: CatalogExtension): Promise<void> {
    setCatalogBusyId(ext.id);
    setError(null);
    try {
      setItems(await window.multizen.extensions.addFromWebStore(profileId, ext.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCatalogBusyId(null);
    }
  }

  const installedIds = new Set(items.map((e) => e.id));
  const attachable = (available ?? []).filter((e) => !installedIds.has(e.id));
  const customItems = items.filter(
    (e) => !HUSH_ESSENTIAL_EXTENSIONS.some((ess) => ess.id === e.id),
  );

  return (
    <div className="space-y-3">
      {/* Stealth Essentials card */}
      <LiveEssentialsBlock
        profileId={profileId}
        items={items}
        onUpdate={setItems}
        onError={setError}
      />

      {/* Custom installed extensions */}
      {customItems.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider px-1">
            Дополнительные расширения ({customItems.length})
          </div>
          {customItems.map((ext) => (
            <ExtRow
              key={ext.id}
              ext={ext}
              profileId={profileId}
              onToggle={(enabled) =>
                void run(() => window.multizen.extensions.toggle(profileId, ext.id, enabled))
              }
              onRemove={() =>
                void run(() => window.multizen.extensions.remove(profileId, ext.id))
              }
            />
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-[12px] text-slate-500 py-2">
          <Loader2 size={13} className="animate-spin text-cyan-400" /> Загрузка расширений…
        </div>
      )}

      {error && (
        <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-[8px] p-2 leading-snug">
          {error}
        </div>
      )}

      <div className="pt-1 border-t border-white/[0.06] space-y-2.5">
        <div className="text-[11px] font-medium text-slate-400 px-1">
          Установить дополнительные расширения
        </div>
        <AddRow
          url={url}
          onUrl={setUrl}
          busy={busy}
          onAddWebStore={() =>
            void run(async () => {
              const next = await window.multizen.extensions.addFromWebStore(profileId, url.trim());
              setUrl("");
              return next;
            })
          }
          onAddFile={() => void run(() => window.multizen.extensions.addFromFile(profileId))}
          onAddFolder={() => void run(() => window.multizen.extensions.addFromFolder(profileId))}
        />

        <CatalogToggle open={showCatalog} onToggle={() => setShowCatalog((v) => !v)} />
        {showCatalog && (
          <ExtensionCatalog
            installedIds={installedIds}
            busyId={catalogBusyId}
            onInstall={(ext) => void installFromCatalog(ext)}
          />
        )}

        <button
          type="button"
          onClick={() => void openAttach()}
          className="btn-ghost px-3 py-[7px] text-[12px] rounded-[9px] inline-flex items-center gap-1.5"
        >
          <Library size={12} />
          {showAttach ? "Скрыть расширения профилей" : "Прикрепить из существующих профилей"}
        </button>

        {showAttach && (
          <div className="space-y-1.5 p-2 rounded-[9px] bg-slate-900/60 border border-white/[0.06]">
            <div className="text-[11px] text-slate-400">
              Расширения, уже сохраненные на диске:
            </div>
            {attachable.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic">
                Нет других сохраненных расширений.
              </div>
            ) : (
              <div className="space-y-1">
                {attachable.map((ext) => (
                  <div
                    key={`${ext.id}-${ext.version}`}
                    className="flex items-center justify-between p-1.5 rounded-[7px] bg-white/[0.02] border border-white/[0.04] text-[12px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ExtIcon ext={ext} className="w-4 h-4 rounded-[4px] shrink-0" />
                      <span className="truncate text-slate-200 font-medium">{ext.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">v{ext.version}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void run(() => window.multizen.extensions.attach(profileId, ext.id, ext.version))
                      }
                      className="btn-secondary px-2 py-0.5 text-[11px] rounded-[6px] shrink-0"
                    >
                      Прикрепить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Staging mode (create profile) ────────────────────────────────────────

function StagingExtensions({
  staged,
  onChange,
}: {
  staged: ExtensionConfig[];
  onChange: Dispatch<SetStateAction<ExtensionConfig[]>>;
}): JSX.Element {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogBusyId, setCatalogBusyId] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [available, setAvailable] = useState<ExtensionConfig[] | null>(null);

  const stagedIds = new Set(staged.map((e) => e.id));

  function upsert(cfg: ExtensionConfig): void {
    onChange((prev) => {
      const idx = prev.findIndex((e) => e.id === cfg.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cfg;
        return next;
      }
      return [...prev, cfg];
    });
  }

  async function run(fn: () => Promise<ExtensionConfig | null>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const cfg = await fn();
      if (cfg) upsert(cfg);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openAttach(): Promise<void> {
    setShowAttach((v) => !v);
    if (available === null) {
      try {
        setAvailable(await window.multizen.extensions.storeEntries());
      } catch {
        setAvailable([]);
      }
    }
  }

  async function installFromCatalog(ext: CatalogExtension): Promise<void> {
    setCatalogBusyId(ext.id);
    setError(null);
    try {
      upsert(await window.multizen.extensions.prepareFromWebStore(ext.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCatalogBusyId(null);
    }
  }

  const attachable = (available ?? []).filter((e) => !stagedIds.has(e.id));
  const customStaged = staged.filter(
    (e) => !HUSH_ESSENTIAL_EXTENSIONS.some((ess) => ess.id === e.id),
  );

  return (
    <div className="space-y-3">
      {/* Stealth Essentials selection card */}
      <StagingEssentialsBlock staged={staged} onChange={onChange} />

      {/* Additional staged custom extensions */}
      {customStaged.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider px-1">
            Дополнительные выбранные расширения ({customStaged.length})
          </div>
          {customStaged.map((ext) => (
            <ExtRow
              key={ext.id}
              ext={ext}
              profileId={null}
              onToggle={(enabled) =>
                onChange((prev) =>
                  prev.map((e) => (e.id === ext.id ? { ...e, enabled } : e)),
                )
              }
              onRemove={() => onChange((prev) => prev.filter((e) => e.id !== ext.id))}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-[8px] p-2 leading-snug">
          {error}
        </div>
      )}

      <div className="pt-1 border-t border-white/[0.06] space-y-2.5">
        <div className="text-[11px] font-medium text-slate-400 px-1">
          Установить любое другое расширение
        </div>
        <AddRow
          url={url}
          onUrl={setUrl}
          busy={busy}
          onAddWebStore={() =>
            void run(async () => {
              const cfg = await window.multizen.extensions.prepareFromWebStore(url.trim());
              setUrl("");
              return cfg;
            })
          }
          onAddFile={() => void run(() => window.multizen.extensions.prepareFromFile())}
          onAddFolder={() => void run(() => window.multizen.extensions.prepareFromFolder())}
        />

        <CatalogToggle open={showCatalog} onToggle={() => setShowCatalog((v) => !v)} />
        {showCatalog && (
          <ExtensionCatalog
            installedIds={stagedIds}
            busyId={catalogBusyId}
            onInstall={(ext) => void installFromCatalog(ext)}
          />
        )}

        <button
          type="button"
          onClick={() => void openAttach()}
          className="btn-ghost px-3 py-[7px] text-[12px] rounded-[9px] inline-flex items-center gap-1.5"
        >
          <Library size={12} />
          {showAttach ? "Скрыть расширения профилей" : "Прикрепить из существующих профилей"}
        </button>

        {showAttach && (
          <div className="space-y-1.5 p-2 rounded-[9px] bg-slate-900/60 border border-white/[0.06]">
            <div className="text-[11px] text-slate-400">
              Расширения, уже сохраненные на диске:
            </div>
            {attachable.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic">
                Нет других сохраненных расширений.
              </div>
            ) : (
              <div className="space-y-1">
                {attachable.map((ext) => (
                  <div
                    key={`${ext.id}-${ext.version}`}
                    className="flex items-center justify-between p-1.5 rounded-[7px] bg-white/[0.02] border border-white/[0.04] text-[12px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ExtIcon ext={ext} className="w-4 h-4 rounded-[4px] shrink-0" />
                      <span className="truncate text-slate-200 font-medium">{ext.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">v{ext.version}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        upsert({
                          id: ext.id,
                          name: ext.name,
                          version: ext.version,
                          enabled: true,
                          scope: "shared",
                        })
                      }
                      className="btn-secondary px-2 py-0.5 text-[11px] rounded-[6px] shrink-0"
                    >
                      Выбрать
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stealth Essentials Components ────────────────────────────────────────

function StagingEssentialsBlock({
  staged,
  onChange,
}: {
  staged: ExtensionConfig[];
  onChange: Dispatch<SetStateAction<ExtensionConfig[]>>;
}): JSX.Element {
  const isSelected = (id: string) => staged.some((e) => e.id === id && e.enabled);

  function toggle(ext: EssentialExtension, checked: boolean) {
    onChange((prev) => {
      const exists = prev.find((e) => e.id === ext.id);
      if (checked) {
        if (exists) {
          return prev.map((e) => (e.id === ext.id ? { ...e, enabled: true } : e));
        }
        return [
          ...prev,
          {
            id: ext.id,
            name: ext.name,
            version: ext.version,
            enabled: true,
            scope: "shared" as const,
          },
        ];
      } else {
        return prev.filter((e) => e.id !== ext.id);
      }
    });
  }

  function selectAll() {
    onChange((prev) => {
      const result = [...prev];
      for (const ext of HUSH_ESSENTIAL_EXTENSIONS) {
        const idx = result.findIndex((e) => e.id === ext.id);
        if (idx >= 0) {
          result[idx] = { ...result[idx], enabled: true };
        } else {
          result.push({
            id: ext.id,
            name: ext.name,
            version: ext.version,
            enabled: true,
            scope: "shared",
          });
        }
      }
      return result;
    });
  }

  function clearAll() {
    onChange((prev) =>
      prev.filter((e) => !HUSH_ESSENTIAL_EXTENSIONS.some((ess) => ess.id === e.id))
    );
  }

  const selectedCount = HUSH_ESSENTIAL_EXTENSIONS.filter((e) => isSelected(e.id)).length;

  return (
    <div className="p-3.5 rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-950/25 to-slate-900/50 shadow-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shadow-inner">
            ⚡
          </div>
          <div>
            <span className="text-[13px] font-semibold text-slate-100">
              Базовый Stealth-пакет (по умолчанию)
            </span>
            <span className="text-[11px] text-cyan-400/80 ml-2 font-mono">
              ({selectedCount} из {HUSH_ESSENTIAL_EXTENSIONS.length} выбрано)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={selectAll}
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors cursor-pointer"
          >
            Выбрать все
          </button>
          <span className="text-slate-600">•</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
          >
            Снять все
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {HUSH_ESSENTIAL_EXTENSIONS.map((ext) => {
          const checked = isSelected(ext.id);
          return (
            <label
              key={ext.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                checked
                  ? "bg-cyan-500/[0.08] border-cyan-500/30 text-slate-100 shadow-sm"
                  : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggle(ext, e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
                />
                <div>
                  <div className="text-[12px] font-medium flex items-center gap-2">
                    <span className={checked ? "text-cyan-200" : "text-slate-300"}>{ext.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 font-mono">
                      v{ext.version}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{ext.description}</div>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono whitespace-nowrap ml-2 ${
                  checked ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-white/[0.04] text-slate-500"
                }`}
              >
                {ext.categoryBadge}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function LiveEssentialsBlock({
  profileId,
  items,
  onUpdate,
  onError,
}: {
  profileId: string;
  items: ExtensionConfig[];
  onUpdate: (next: ExtensionConfig[]) => void;
  onError: (err: string | null) => void;
}): JSX.Element {
  const [busyId, setBusyId] = useState<string | null>(null);

  const isInstalled = (id: string) => items.some((e) => e.id === id);
  const isEnabled = (id: string) => items.some((e) => e.id === id && e.enabled);

  async function toggle(ext: EssentialExtension, shouldEnable: boolean) {
    setBusyId(ext.id);
    onError(null);
    try {
      const existing = items.find((e) => e.id === ext.id);
      if (shouldEnable) {
        if (existing) {
          onUpdate(await window.multizen.extensions.toggle(profileId, ext.id, true));
        } else {
          onUpdate(await window.multizen.extensions.addFromWebStore(profileId, ext.id));
        }
      } else {
        if (existing) {
          onUpdate(await window.multizen.extensions.remove(profileId, ext.id));
        }
      }
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function activateAll() {
    setBusyId("all");
    onError(null);
    try {
      let current = [...items];
      for (const ext of HUSH_ESSENTIAL_EXTENSIONS) {
        if (!current.some((e) => e.id === ext.id)) {
          current = await window.multizen.extensions.addFromWebStore(profileId, ext.id);
        } else if (!current.some((e) => e.id === ext.id && e.enabled)) {
          current = await window.multizen.extensions.toggle(profileId, ext.id, true);
        }
      }
      onUpdate(current);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const installedCount = HUSH_ESSENTIAL_EXTENSIONS.filter((e) => isInstalled(e.id) && isEnabled(e.id)).length;

  return (
    <div className="p-3.5 rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-950/25 to-slate-900/50 shadow-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shadow-inner">
            ⚡
          </div>
          <div>
            <span className="text-[13px] font-semibold text-slate-100">
              Базовый Stealth-пакет (Hush Essentials)
            </span>
            <span className="text-[11px] text-cyan-400/80 ml-2 font-mono">
              ({installedCount} из {HUSH_ESSENTIAL_EXTENSIONS.length} активно)
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void activateAll()}
          disabled={busyId !== null}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {busyId === "all" ? "Установка..." : "Активировать все"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {HUSH_ESSENTIAL_EXTENSIONS.map((ext) => {
          const installed = isInstalled(ext.id);
          const enabled = isEnabled(ext.id);
          const active = installed && enabled;
          const isBusy = busyId === ext.id || busyId === "all";

          return (
            <label
              key={ext.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                active
                  ? "bg-cyan-500/[0.08] border-cyan-500/30 text-slate-100 shadow-sm"
                  : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04]"
              } ${isBusy ? "opacity-60 cursor-wait" : ""}`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={active}
                  disabled={isBusy}
                  onChange={(e) => void toggle(ext, e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
                />
                <div>
                  <div className="text-[12px] font-medium flex items-center gap-2">
                    <span className={active ? "text-cyan-200" : "text-slate-300"}>{ext.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 font-mono">
                      v{ext.version}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{ext.description}</div>
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono whitespace-nowrap ml-2 ${
                  active ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-white/[0.04] text-slate-500"
                }`}
              >
                {ext.categoryBadge}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function ExtRow({
  ext,
  profileId,
  onToggle,
  onRemove,
}: {
  ext: ExtensionConfig;
  profileId: string | null;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between p-2 rounded-[9px] bg-slate-900/60 border border-white/[0.06] text-[12px]">
      <div className="flex items-center gap-2.5 min-w-0">
        <ExtIcon ext={ext} className="w-5 h-5 rounded-[5px] shrink-0" />
        <div className="min-w-0">
          <div className="font-medium text-slate-200 truncate">{ext.name}</div>
          <div className="text-[10px] text-slate-500 font-mono">
            v{ext.version}
            {profileId === null && (
              <span className="ml-2 text-cyan-400 font-sans">готов к установке</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={ext.enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
        </label>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Удалить расширение"
          className="p-1 rounded-[5px] text-slate-500 hover:text-rose-400 hover:bg-white/[0.04] transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function AddRow({
  url,
  onUrl,
  busy,
  onAddWebStore,
  onAddFile,
  onAddFolder,
}: {
  url: string;
  onUrl: (v: string) => void;
  busy: boolean;
  onAddWebStore: () => void;
  onAddFile: () => void;
  onAddFolder: () => void;
}): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => onUrl(e.target.value)}
          placeholder="Вставьте ссылку Chrome Web Store или ID..."
          className="input flex-1 text-[12px] h-8 bg-slate-900/60 border-white/[0.08] focus:border-cyan-500/50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim() && !busy) {
              e.preventDefault();
              onAddWebStore();
            }
          }}
        />
        <button
          type="button"
          onClick={onAddWebStore}
          disabled={!url.trim() || busy}
          className="btn-primary px-3 py-1 text-[12px] h-8 rounded-[8px] flex items-center gap-1.5 shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
          Добавить
        </button>
      </div>

      <div className="flex gap-2 text-[11px]">
        <button
          type="button"
          onClick={onAddFile}
          disabled={busy}
          className="btn-ghost px-2.5 py-1 rounded-[7px] text-slate-400 hover:text-slate-200 border border-white/[0.06] hover:bg-white/[0.04] flex items-center gap-1"
        >
          <Plus size={11} /> Из файла (.crx, .zip)
        </button>
        <button
          type="button"
          onClick={onAddFolder}
          disabled={busy}
          className="btn-ghost px-2.5 py-1 rounded-[7px] text-slate-400 hover:text-slate-200 border border-white/[0.06] hover:bg-white/[0.04] flex items-center gap-1"
        >
          <Plus size={11} /> Из папки (распакованное)
        </button>
      </div>
    </div>
  );
}

function CatalogToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="btn-ghost px-3 py-[7px] text-[12px] rounded-[9px] inline-flex items-center gap-1.5 text-slate-300 hover:text-white border border-white/[0.06] hover:bg-white/[0.04]"
    >
      <LayoutGrid size={12} className="text-cyan-400" />
      {open ? "Скрыть каталог расширений" : "Открыть каталог расширений (Discover)"}
    </button>
  );
}
