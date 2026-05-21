import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, Download, Eye, LayoutGrid, List,
  FileText, FileSpreadsheet, FileCode, Files, Loader2,
  AlertTriangle, Upload, Clock, RefreshCw, Trash2,
  ChevronDown, X, Check, History, Plus, FolderOpen,
  Tag, Users, Building2, ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  documentsService,
  type Document,
  type Category,
  type DocumentVersion,
  type CustomerOption,
  type CustomerAdminOption,
  type ProjectOption,
} from "@/services/documents";
import { useAuth } from "@/contexts/AuthContext";

/* ─── Brand tokens ─── */
const BRAND       = "#E8510A";
const BRAND_LIGHT = "#FEF0E9";
const BRAND_MID   = "#F97316";

/* ─── Constants & helpers ─── */
const MAX_MB    = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

const FILE_META: Record<string, { color: string; bg: string; label: string }> = {
  pdf:  { color: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-500/10",         label: "PDF"  },
  xlsx: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10",   label: "XLSX" },
  xls:  { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10",   label: "XLS"  },
  dwg:  { color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-500/10",         label: "DWG"  },
  dxf:  { color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-500/10",         label: "DXF"  },
  docx: { color: "text-sky-600 dark:text-sky-400",         bg: "bg-sky-50 dark:bg-sky-500/10",           label: "DOCX" },
  doc:  { color: "text-sky-600 dark:text-sky-400",         bg: "bg-sky-50 dark:bg-sky-500/10",           label: "DOC"  },
};

function fileMeta(type: string) {
  return FILE_META[type] ?? { color: "text-zinc-500", bg: "bg-zinc-100 dark:bg-zinc-800", label: type?.toUpperCase() || "FILE" };
}

function FileIcon({ type, className }: { type: string; className?: string }) {
  if (type === "xlsx" || type === "xls") return <FileSpreadsheet className={className} />;
  if (type === "dwg"  || type === "dxf") return <FileCode className={className} />;
  return <FileText className={className} />;
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_CFG = {
  published: { label: "Published", cls: "bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-900" },
  draft:     { label: "Draft",     cls: "bg-amber-500/10 text-amber-600 border border-amber-200 dark:border-amber-900" },
  archived:  { label: "Archived",  cls: "bg-muted text-muted-foreground border border-border" },
};

/* ─── Shared input class (orange focus, matches dashboard modals) ─── */
const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15 placeholder:text-muted-foreground/30";

/* ─────────────────────────────────────────────────────────────────────────────
   Upload Modal
───────────────────────────────────────────────────────────────────────────── */
interface UploadModalProps {
  projectId?: number;
  projects?: ProjectOption[];
  onClose: () => void;
  onSuccess: (doc: Document) => void;
}

const CATEGORIES = [
  { value: "commercials",   label: "Commercials" },
  { value: "manuals",       label: "Manuals" },
  { value: "drawings",      label: "Drawings" },
  { value: "commissioning", label: "Commissioning Reports" },
  { value: "certificates",  label: "Certificates" },
  { value: "other",         label: "Other" },
];

function UploadModal({ projectId, projects: propProjects, onClose, onSuccess }: UploadModalProps) {
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [category, setCategory] = useState("other");
  const [version, setVersion]   = useState("v1.0");
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [fetchedProjects, setFetchedProjects] = useState<ProjectOption[]>([]);
  const projects = propProjects ?? fetchedProjects;
  const [selectedProject, setSelected] = useState<number | undefined>(projectId);

  useEffect(() => {
    if (projectId || propProjects) return;
    documentsService.listProjects().then(setFetchedProjects).catch(() => {});
  }, [projectId, propProjects]);

  const handleFile = (f: File) => {
    if (f.size > MAX_BYTES) { setErr(`File exceeds ${MAX_MB} MB limit.`); return; }
    setErr(null); setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setErr("Please select a file."); return; }
    if (!selectedProject) { setErr("Please select a project."); return; }
    setSaving(true); setErr(null);
    try {
      const doc = await documentsService.upload({
        project: selectedProject, title, description: desc,
        category, file, version, is_public: isPublic,
      });
      onSuccess(doc);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.response?.data?.file?.[0] || "Upload failed.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Brand accent bar */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${BRAND}, ${BRAND_MID})` }} />
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em]" style={{ color: BRAND }}>Document Library</p>
            <h2 className="mt-0.5 text-[18px] font-bold">Upload Document</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {err && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-[13px] text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-all",
              dragOver ? "border-orange-400 bg-orange-50 dark:bg-orange-500/5"
              : file   ? "border-emerald-400/60 bg-emerald-50/50 dark:bg-emerald-500/5"
              : "border-border hover:border-orange-400/50 hover:bg-muted/30"
            )}
          >
            <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file ? (
              <>
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl mb-3", fileMeta(file.name.split(".").pop() ?? "").bg)}>
                  <FileIcon type={file.name.split(".").pop() ?? ""} className={cn("h-6 w-6", fileMeta(file.name.split(".").pop() ?? "").color)} strokeWidth={1.5} />
                </div>
                <p className="text-[14px] font-bold text-foreground">{file.name}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <Upload className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <p className="text-[14px] font-semibold">Drop file here or click to browse</p>
                <p className="mt-1 text-[12px] text-muted-foreground">PDF, DOCX, XLSX, DWG, DXF, PNG, JPG, ZIP · Max {MAX_MB} MB</p>
              </>
            )}
          </div>

          {!projectId && (
            <div>
              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Project *</label>
              <div className="relative">
                <select required className={cn(inputCls, "appearance-none pr-10")} value={selectedProject ?? ""} onChange={e => setSelected(e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="" disabled>Select a project…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Title *</label>
            <input className={inputCls} required value={title} onChange={e => setTitle(e.target.value)} placeholder="Document title" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Category</label>
              <div className="relative">
                <select className={cn(inputCls, "appearance-none pr-10")} value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Version</label>
              <input className={inputCls} value={version} onChange={e => setVersion(e.target.value)} placeholder="v1.0" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Description</label>
            <textarea className={`${inputCls} h-16 resize-none`} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional notes…" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <button type="button" role="checkbox" aria-checked={isPublic} onClick={() => setIsPublic(v => !v)}
              className={cn("relative h-5 w-9 rounded-full border transition-all", isPublic ? "border-orange-500" : "bg-muted border-border")}
              style={isPublic ? { background: BRAND } : {}}>
              <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", isPublic ? "translate-x-4" : "translate-x-0.5")} />
            </button>
            <span className="text-[14px] font-medium">Visible to all project members</span>
          </label>

          <div className="flex gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold text-white disabled:opacity-60 transition-colors hover:opacity-90"
              style={{ background: BRAND }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {saving ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Version Bump Modal
───────────────────────────────────────────────────────────────────────────── */
function VersionModal({ doc, onClose, onSuccess }: { doc: Document; onClose: () => void; onSuccess: (updated: Document) => void }) {
  const [file, setFile]         = useState<File | null>(null);
  const [version, setVersion]   = useState("");
  const [note, setNote]         = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cur = doc.version.replace(/[^0-9.]/g, "");
    const parts = cur.split(".");
    const last = parseInt(parts[parts.length - 1] || "0", 10);
    parts[parts.length - 1] = String(last + 1);
    setVersion(`v${parts.join(".")}`);
  }, [doc.version]);

  const handleFile = (f: File) => {
    if (f.size > MAX_BYTES) { setErr(`File exceeds ${MAX_MB} MB limit.`); return; }
    setErr(null); setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setErr("Please select a file."); return; }
    setSaving(true); setErr(null);
    try {
      const updated = await documentsService.uploadVersion(doc.id, { file, version, change_note: note });
      onSuccess(updated);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Version upload failed.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-0.5" style={{ background: `linear-gradient(to right, ${BRAND}, ${BRAND_MID})` }} />
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em]" style={{ color: BRAND }}>Version Control</p>
            <h2 className="mt-0.5 text-[18px] font-bold">Upload New Version</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="mx-6 mt-5 flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", fileMeta(doc.file_type).bg)}>
            <FileIcon type={doc.file_type} className={cn("h-4 w-4", fileMeta(doc.file_type).color)} strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold truncate">{doc.title}</p>
            <p className="text-[11px] text-muted-foreground">
              Current: <span className="font-mono font-bold">{doc.version}</span> → will be archived
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {err && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-[13px] text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
            </div>
          )}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={cn("flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-6 cursor-pointer transition-all",
              dragOver ? "border-orange-400 bg-orange-50 dark:bg-orange-500/5"
              : file   ? "border-emerald-400/60 bg-emerald-50/50 dark:bg-emerald-500/5"
              : "border-border hover:border-orange-400/50 hover:bg-muted/30"
            )}>
            <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {file ? (
              <><p className="text-[14px] font-bold">{file.name}</p><p className="mt-1 text-[12px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p></>
            ) : (
              <><RefreshCw className="mb-2 h-6 w-6 text-muted-foreground/40" /><p className="text-[13px] font-semibold">Drop new file or click to browse</p><p className="mt-0.5 text-[11px] text-muted-foreground">Max {MAX_MB} MB</p></>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">New Version Tag *</label>
            <input className={inputCls} required value={version} onChange={e => setVersion(e.target.value)} placeholder="v2.0" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[.12em] text-muted-foreground/60">Change Notes</label>
            <textarea className={`${inputCls} h-16 resize-none`} value={note} onChange={e => setNote(e.target.value)} placeholder="What changed in this version?" />
          </div>
          <div className="flex gap-3 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
              style={{ background: BRAND }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {saving ? "Uploading…" : "Upload Version"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Version History Drawer
───────────────────────────────────────────────────────────────────────────── */
function VersionHistoryDrawer({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    documentsService.versions(doc.id).then(setVersions).finally(() => setLoading(false));
  }, [doc.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-card border-l border-border shadow-2xl">
        <div className="h-0.5" style={{ background: `linear-gradient(to right, ${BRAND}, ${BRAND_MID})` }} />
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em]" style={{ color: BRAND }}>Version Control</p>
            <h2 className="mt-0.5 text-[16px] font-bold truncate max-w-[260px]">{doc.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-1">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/50">Current</p>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/50 dark:bg-emerald-500/5 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-lg bg-emerald-500 px-2.5 py-1 font-mono text-[11px] font-bold text-white">{doc.version}</span>
                  <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">Active</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{fmt(doc.updated_at)}</span>
              </div>
              <p className="mt-1.5 text-[12px] text-muted-foreground">{doc.file_size_display} · {doc.file_type?.toUpperCase()}</p>
            </div>
          </div>
          {loading && <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" /></div>}
          {!loading && versions.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[.15em] text-muted-foreground/50">Previous Versions ({versions.length})</p>
              <div className="relative space-y-0">
                <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />
                {versions.map((v, i) => (
                  <div key={v.id} className="relative flex gap-4 pb-4">
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
                      <span className="font-mono text-[9px] font-black text-muted-foreground/50">{String(versions.length - i).padStart(2, "0")}</span>
                    </div>
                    <div className="flex-1 rounded-xl border border-border bg-muted/20 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-[11px] font-bold">{v.version}</span>
                        <span className="text-[11px] text-muted-foreground">{fmt(v.created_at)}</span>
                      </div>
                      {v.change_note && <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed italic">"{v.change_note}"</p>}
                      <p className="mt-1.5 text-[11px] text-muted-foreground/60">by {v.uploaded_by_name || "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!loading && versions.length === 0 && (
            <div className="mt-8 flex flex-col items-center justify-center text-center">
              <History className="mb-3 h-10 w-10 text-muted-foreground/15" />
              <p className="text-[14px] font-semibold text-muted-foreground/50">No previous versions</p>
              <p className="mt-1 text-[12px] text-muted-foreground/30">Upload a new version to create a history trail</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Delete Confirm
───────────────────────────────────────────────────────────────────────────── */
function DeleteModal({ doc, onClose, onSuccess }: { doc: Document; onClose: () => void; onSuccess: (id: number) => void }) {
  const [deleting, setDeleting] = useState(false);
  const confirm = async () => {
    setDeleting(true);
    try { await documentsService.delete(doc.id); onSuccess(doc.id); }
    catch {} finally { setDeleting(false); }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-0.5 bg-rose-500" />
        <div className="p-6">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10">
              <Trash2 className="h-5 w-5 text-rose-500" />
            </div>
            <h3 className="text-[16px] font-bold">Delete Document?</h3>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            "<strong>{doc.title}</strong>" and all its version history will be permanently deleted.
          </p>
          <div className="mt-6 flex gap-3">
            <button onClick={onClose} disabled={deleting} className="flex-1 rounded-xl border border-border py-2.5 text-[14px] font-semibold text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
            <button onClick={confirm} disabled={deleting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 text-[14px] font-bold text-white hover:bg-rose-600 disabled:opacity-60 transition-colors">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Filter Dropdown
───────────────────────────────────────────────────────────────────────────── */
function FilterDropdown<T extends { id: number | string; name: string }>({
  options, selectedId, allLabel, onChange, icon,
}: { options: T[]; selectedId: T["id"] | undefined; allLabel: string; onChange: (id: T["id"] | undefined) => void; icon?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = options.find(o => o.id === selectedId);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (options.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className={cn("flex min-w-[160px] items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition-all",
          open || selectedId
            ? "border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/5 text-orange-600 dark:text-orange-400"
            : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
        )}>
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="flex-1 truncate text-left">{sel?.name ?? allLabel}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/10">
          <div className="p-1.5 max-h-60 overflow-y-auto">
            <button onClick={() => { onChange(undefined); setOpen(false); }}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                !selectedId ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" : "hover:bg-muted"
              )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", !selectedId ? "bg-orange-500" : "bg-border")} />
              <span className="flex-1 text-left">{allLabel}</span>
              {!selectedId && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
            <div className="my-1 mx-2 h-px bg-border" />
            {options.map(opt => (
              <button key={opt.id} onClick={() => { onChange(opt.id as any); setOpen(false); }}
                className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                  selectedId === opt.id ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" : "hover:bg-muted"
                )}>
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", selectedId === opt.id ? "bg-orange-500" : "bg-muted-foreground/30")} />
                <span className="flex-1 truncate text-left">{opt.name}</span>
                {selectedId === opt.id && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Row action menu
───────────────────────────────────────────────────────────────────────────── */
function ActionMenu({ doc, canManage, downloading, onDownload, onPreview, onVersion, onHistory, onDelete, onUpdate }: {
  doc: Document; canManage: boolean; downloading: boolean;
  onDownload: () => void; onPreview: () => void; onVersion: () => void;
  onHistory: () => void; onDelete: () => void; onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="p-1">
              <button onClick={() => { onPreview(); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium hover:bg-muted transition-colors">
                <Eye className="h-4 w-4 text-muted-foreground/60" /> Preview
              </button>
              <button onClick={() => { onDownload(); setOpen(false); }} disabled={downloading} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium hover:bg-muted transition-colors disabled:opacity-50">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" /> : <Download className="h-4 w-4 text-muted-foreground/60" />}
                Download
              </button>
              <button onClick={() => { onHistory(); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium hover:bg-muted transition-colors">
                <History className="h-4 w-4 text-muted-foreground/60" />
                Version History
                {doc.version_count > 0 && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-bold">{doc.version_count}</span>}
              </button>
              {canManage && (
                <>
                  <div className="my-1 mx-2 h-px bg-border" />
                  <button onClick={() => { onUpdate(); setOpen(false); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10"
                    style={{ color: BRAND }}>
                    <RefreshCw className="h-4 w-4" /> Update (new version)
                  </button>
                  <button onClick={() => { onDelete(); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Documents page
───────────────────────────────────────────────────────────────────────────── */
export default function Documents({ projectId }: { projectId?: number } = {}) {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "project_manager";

  const [documents, setDocuments]     = useState<Document[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [category, setCategory]       = useState<string>("All");
  const [query, setQuery]             = useState("");
  const [view, setView]               = useState<"list" | "grid">("list");

  const [allProjects, setAllProjects]                   = useState<ProjectOption[]>([]);
  const [customers, setCustomers]                       = useState<CustomerOption[]>([]);
  const [activeCustomerId, setActiveCustomerId]         = useState<number | undefined>(undefined);
  const [activeProjectId, setActiveProjectId]           = useState<number | undefined>(undefined);
  const [customerAdmins, setCustomerAdmins]             = useState<CustomerAdminOption[]>([]);
  const [activeCustomerAdminId, setActiveCustomerAdminId] = useState<number | undefined>(undefined);

  const filteredProjects: ProjectOption[] = (() => {
    let base = allProjects;
    if (activeCustomerAdminId) {
      const admin = customerAdmins.find(ca => ca.id === activeCustomerAdminId);
      if (admin) base = base.filter(p => admin.project_ids.includes(p.id));
    }
    if (!activeCustomerId) return base;
    return base.filter(p =>
      p.customer_id != null ? p.customer_id === activeCustomerId : p.customer_name === customers.find(c => c.id === activeCustomerId)?.name
    );
  })();

  useEffect(() => {
    if (projectId) return;
    documentsService.listProjects().then(ps => {
      setAllProjects(ps);
      const seen = new Map<number | string, CustomerOption>();
      ps.forEach((p: any) => { const key = p.customer_id ?? p.customer_name; if (p.customer_name && !seen.has(key)) seen.set(key, { id: p.customer_id ?? p.customer_name, name: p.customer_name }); });
      if (seen.size > 0) setCustomers(Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name)));
    }).catch(() => {});
    documentsService.listCustomers().then(cs => { if (cs.length > 0) setCustomers(cs); }).catch(() => {});
    if (canManage) documentsService.listCustomerAdmins().then(cas => { if (cas.length > 0) setCustomerAdmins(cas); }).catch(() => {});
  }, [projectId]);

  const [showUpload, setShowUpload] = useState(false);
  const [versionDoc, setVersionDoc] = useState<Document | null>(null);
  const [historyDoc, setHistoryDoc] = useState<Document | null>(null);
  const [deleteDoc, setDeleteDoc]   = useState<Document | null>(null);

  const load = () => {
    setLoading(true);
    const proj = projectId ?? activeProjectId;
    const params: Parameters<typeof documentsService.list>[0] = {};
    if (proj) params.project = proj;
    if (activeCustomerAdminId) params.customer_admin_id = activeCustomerAdminId;
    Promise.all([
      documentsService.list(Object.keys(params).length ? params : undefined),
      documentsService.categories(),
    ])
      .then(([docs, cats]) => { setDocuments(docs); setCategories(cats); })
      .catch(() => setError("Failed to load documents."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [projectId, activeProjectId, activeCustomerAdminId]);

  const filtered = useMemo(() => {
    const lq = (query ?? "").toLowerCase();
    return documents.filter(d => {
      const catVal  = (categories.find(c => c.label === category)?.value ?? "").toLowerCase();
      const matchCat = category === "All" || (d.category ?? "").toLowerCase() === catVal || (d.category ?? "").toLowerCase() === category.toLowerCase();
      const matchQ   = lq === "" || (d.title ?? "").toLowerCase().includes(lq);
      return matchCat && matchQ;
    });
  }, [documents, category, query, categories]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { All: documents.length };
    categories.forEach(c => { m[c.label] = c.count; });
    return m;
  }, [documents, categories]);

  const allCategories = ["All", ...categories.map(c => c.label)];

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id);
    try { await documentsService.download(doc.id, `${doc.title}.${doc.file_type}`); }
    finally { setDownloading(null); }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="flex h-64 items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: BRAND }}>
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading documents…</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
          <AlertTriangle className="h-7 w-7 text-rose-500" />
        </div>
        <p className="text-[15px] font-bold">{error}</p>
        <button onClick={load} className="text-[13px] font-semibold hover:underline" style={{ color: BRAND }}>Try again</button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="w-full max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-0.5 w-5 rounded-full" style={{ background: BRAND }} />
              <span className="text-[11px] font-bold uppercase tracking-[.2em]" style={{ color: BRAND }}>Document Library</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Version-controlled files — commercials, drawings, manuals & reports</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {!projectId && customers.length > 0 && (
              <FilterDropdown<CustomerOption> options={customers} selectedId={activeCustomerId} allLabel="All Customers" onChange={id => setActiveCustomerId(id as number | undefined)} icon={<Users className="h-3.5 w-3.5" />} />
            )}
            {!projectId && canManage && customerAdmins.length > 0 && (
              <FilterDropdown<CustomerAdminOption> options={customerAdmins} selectedId={activeCustomerAdminId} allLabel="All Admins" onChange={id => { setActiveCustomerAdminId(id as number | undefined); setActiveProjectId(undefined); }} icon={<Building2 className="h-3.5 w-3.5" />} />
            )}
            {!projectId && filteredProjects.length > 0 && (
              <FilterDropdown<ProjectOption> options={filteredProjects} selectedId={activeProjectId} allLabel="All Projects" onChange={id => setActiveProjectId(id as number | undefined)} icon={<FolderOpen className="h-3.5 w-3.5" />} />
            )}
            {canManage && (
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition-all hover:opacity-90"
                style={{ background: BRAND }}>
                <Upload className="h-4 w-4" /> Upload Document
              </button>
            )}
          </div>
        </div>

        {/* ── KPI stat row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Files",  value: documents.length,                                       iconBg: BRAND,      textColor: "text-foreground" },
            { label: "Published",    value: documents.filter(d => d.status === "published").length,  iconBg: "#10b981",  textColor: "text-emerald-600 dark:text-emerald-400" },
            { label: "Versioned",    value: documents.filter(d => d.version_count > 0).length,       iconBg: "#3b82f6",  textColor: "text-blue-600 dark:text-blue-400" },
            { label: "Downloads",    value: documents.reduce((s, d) => s + d.download_count, 0),     iconBg: BRAND_MID,  textColor: "text-orange-600 dark:text-orange-400" },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-3" style={{ background: s.iconBg }}>
                <Files className="h-5 w-5 text-white" strokeWidth={1.75} />
              </div>
              <p className={cn("text-2xl font-bold tabular-nums tracking-tight", s.textColor)}>{s.value}</p>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Search + category filters ── */}
        <div className="bg-card rounded-2xl border border-border shadow-sm px-5 py-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by title…"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-[14px] outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-400/15" />
            </div>
            <div className="flex items-center gap-0.5 rounded-xl border border-border bg-muted/30 p-1">
              {([{ id: "list" as const, icon: List }, { id: "grid" as const, icon: LayoutGrid }]).map(({ id, icon: Icon }) => (
                <button key={id} onClick={() => setView(id)}
                  className={cn("flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                    view === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}>
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={cn("flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-[13px] font-semibold transition-all",
                  category === c ? "text-white border-transparent" : "border-border text-muted-foreground hover:bg-muted/50"
                )}
                style={category === c ? { background: BRAND } : {}}>
                <FolderOpen className="h-3.5 w-3.5" />
                {c}
                <span className={cn("rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold",
                  category === c ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {counts[c] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── List view ── */}
        {view === "list" && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_auto_auto_auto_auto] items-center gap-4 border-b border-border bg-muted/30 px-6 py-3">
              {["Document", "Category", "Version", "Updated", "Status", ""].map((h, i) => (
                <span key={i} className={cn("text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground/60", i === 5 && "text-right")}>{h}</span>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Files className="mb-4 h-12 w-12 text-muted-foreground/15" />
                <p className="text-[15px] font-bold text-muted-foreground/50">No documents found</p>
                <p className="mt-1 text-[13px] text-muted-foreground/30">Adjust your search or category filter</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filtered.map(d => {
                  const meta   = fileMeta(d.file_type);
                  const status = STATUS_CFG[d.status] ?? STATUS_CFG.draft;
                  return (
                    <div key={d.id} className="grid grid-cols-[2fr_1fr_auto_auto_auto_auto] items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors group">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.bg)}>
                          <FileIcon type={d.file_type} className={cn("h-5 w-5", meta.color)} strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold truncate">{d.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase", meta.bg, meta.color)}>{meta.label}</span>
                            <span className="text-[11px] text-muted-foreground">{d.file_size_display}</span>
                            {d.version_count > 0 && <span className="flex items-center gap-1 text-[11px] text-blue-500"><History className="h-3 w-3" /> {d.version_count} prev</span>}
                          </div>
                        </div>
                      </div>
                      <span className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-[12px] font-semibold capitalize truncate">{d.category}</span>
                      <span className="rounded-lg bg-muted px-3 py-1.5 font-mono text-[12px] font-bold">{d.version}</span>
                      <span className="text-[13px] tabular-nums text-muted-foreground whitespace-nowrap">{fmt(d.updated_at)}</span>
                      <span className={cn("rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap", status.cls)}>{status.label}</span>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => d.file_url && window.open(d.file_url, "_blank")} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Preview">
                          <Eye className="h-4 w-4" />
                        </button>
                        <ActionMenu doc={d} canManage={canManage} downloading={downloading === d.id}
                          onDownload={() => handleDownload(d)} onPreview={() => d.file_url && window.open(d.file_url, "_blank")}
                          onVersion={() => setVersionDoc(d)} onHistory={() => setHistoryDoc(d)}
                          onDelete={() => setDeleteDoc(d)} onUpdate={() => setVersionDoc(d)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Grid view ── */}
        {view === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20">
                <Files className="mb-4 h-12 w-12 text-muted-foreground/15" />
                <p className="text-[15px] font-bold text-muted-foreground/50">No documents found</p>
              </div>
            )}
            {filtered.map(d => {
              const meta   = fileMeta(d.file_type);
              const status = STATUS_CFG[d.status] ?? STATUS_CFG.draft;
              return (
                <div key={d.id} className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md hover:-translate-y-px transition-all duration-200">
                  {/* Card top accent */}
                  <div className="h-1 w-full" style={{ background: d.status === "published" ? "#10b981" : d.status === "archived" ? "#94a3b8" : BRAND_MID }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", meta.bg)}>
                        <FileIcon type={d.file_type} className={cn("h-6 w-6", meta.color)} strokeWidth={1.5} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-lg bg-muted px-2 py-1 font-mono text-[11px] font-bold">{d.version}</span>
                        {d.version_count > 0 && <span className="flex items-center gap-0.5 text-[11px] text-blue-500"><History className="h-3 w-3" />{d.version_count}</span>}
                      </div>
                    </div>
                    <p className="text-[14px] font-bold leading-snug line-clamp-2 mb-1">{d.title}</p>
                    <p className="text-[12px] text-muted-foreground capitalize mb-3">{d.category} · {d.file_size_display}</p>
                    <div className="flex items-center justify-between">
                      <span className={cn("rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide", status.cls)}>{status.label}</span>
                      <span className="text-[11px] text-muted-foreground">{fmt(d.updated_at)}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0" style={{ background: BRAND }}>
                        {d.uploaded_by_name ? initials(d.uploaded_by_name) : "?"}
                      </div>
                      <span className="flex-1 truncate text-[11px] text-muted-foreground">{d.uploaded_by_name}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => d.file_url && window.open(d.file_url, "_blank")} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors"><Eye className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => handleDownload(d)} disabled={downloading === d.id} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors">
                          {downloading === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : <Download className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                        {canManage && (
                          <button onClick={() => setVersionDoc(d)} className="flex h-7 items-center gap-1 rounded-lg px-2 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors" style={{ background: BRAND_LIGHT }}>
                            <RefreshCw className="h-3.5 w-3.5" style={{ color: BRAND }} />
                            <span className="text-[10px] font-bold" style={{ color: BRAND }}>Update</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="pt-4 pb-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">DMW Robotics</span>
            <span>© 2023 DMW Industrial Systems GMBH</span>
          </div>
          <div className="flex items-center gap-5">
            {["Security Policy", "API Docs", "Privacy", "Terms of Service"].map(l => (
              <button key={l} className="hover:text-foreground transition-colors">{l}</button>
            ))}
          </div>
        </footer>
      </div>

      {/* ── Modals ── */}
      {showUpload && <UploadModal projectId={projectId} projects={projectId ? undefined : filteredProjects} onClose={() => setShowUpload(false)} onSuccess={doc => { setDocuments(p => [doc, ...p]); setShowUpload(false); }} />}
      {versionDoc && <VersionModal doc={versionDoc} onClose={() => setVersionDoc(null)} onSuccess={updated => { setDocuments(p => p.map(d => d.id === updated.id ? updated : d)); setVersionDoc(null); }} />}
      {historyDoc && <VersionHistoryDrawer doc={historyDoc} onClose={() => setHistoryDoc(null)} />}
      {deleteDoc && <DeleteModal doc={deleteDoc} onClose={() => setDeleteDoc(null)} onSuccess={id => { setDocuments(p => p.filter(d => d.id !== id)); setDeleteDoc(null); }} />}
    </div>
  );
}