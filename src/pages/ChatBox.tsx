/**
 * ChatBox.tsx
 *
 * Floating chat widget that lives in your app shell (e.g. Layout.tsx).
 * - Customers see all their project chats; managers see all projects
 * - Real-time via polling (swap for WebSocket/SSE in production)
 * - Push notifications via the Notification API + in-app badge
 * - Matches the existing font-mono / orange-500 design language
 *
 * Usage in your layout:
 *   import ChatBox from "@/components/ChatBox";
 *   ...
 *   <ChatBox />
 *
 * Backend requirements (see chat_views.py, chat_serializers.py, chat_urls.py
 * that ship alongside this file):
 *   GET  /api/chat/rooms/          → [{ id, project_name, unread_count }]
 *   GET  /api/chat/rooms/:id/messages/   → [{ id, sender_name, sender_role, message, created_at }]
 *   POST /api/chat/rooms/:id/messages/   → { message }
 *   POST /api/chat/rooms/:id/read/       → mark all as read
 */

import {
  useState, useEffect, useRef, useCallback,
} from "react";
import {
  MessageCircle, X, Send, ChevronLeft,
  Loader2, Circle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface ChatRoom {
  id:           number;
  project_name: string;
  unread_count: number;
  last_message?: string;
  last_at?:      string;
}

interface ChatMessage {
  id:          number;
  sender_name: string;
  sender_role: string;
  message:     string;
  created_at:  string;
}

/* ── Constants ─────────────────────────────────────────────────────────────── */
const POLL_MS       = 5_000;   // poll interval for new messages
const API_BASE      = "/api/chat";

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem("access_token") ?? sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────────── */
export default function ChatBox() {
  const { user } = useAuth();

  /* ── UI state ── */
  const [open,        setOpen]        = useState(false);
  const [activeRoom,  setActiveRoom]  = useState<ChatRoom | null>(null);
  const [rooms,       setRooms]       = useState<ChatRoom[]>([]);
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [draft,       setDraft]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [loadingRooms,    setLoadingRooms]    = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMsgIds  = useRef<Set<number>>(new Set());

  /* ── Scroll to bottom ── */
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* ── Load rooms ── */
  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const data = await api<ChatRoom[]>("/rooms/");
      setRooms(data);
      setTotalUnread(data.reduce((s, r) => s + r.unread_count, 0));
    } catch { /* silent */ }
    finally { setLoadingRooms(false); }
  }, []);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 15_000);
    return () => clearInterval(interval);
  }, [loadRooms]);

  /* ── Load / poll messages ── */
  const loadMessages = useCallback(async (room: ChatRoom, isInitial = false) => {
    if (isInitial) setLoadingMessages(true);
    try {
      const data = await api<ChatMessage[]>(`/rooms/${room.id}/messages/`);

      // Browser push notification for new messages
      const newMsgs = data.filter(m => !prevMsgIds.current.has(m.id));
      if (!isInitial && newMsgs.length > 0) {
        newMsgs.forEach(m => {
          if (m.sender_name !== user?.full_name) {
            triggerBrowserNotification(m, room.project_name);
          }
        });
      }
      prevMsgIds.current = new Set(data.map(m => m.id));

      setMessages(data);
      if (isInitial || newMsgs.length > 0) setTimeout(scrollToBottom, 50);
    } catch { /* silent */ }
    finally { if (isInitial) setLoadingMessages(false); }
  }, [user?.full_name, scrollToBottom]);

  /* ── Start / stop polling when room changes ── */
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeRoom) return;

    prevMsgIds.current = new Set();
    loadMessages(activeRoom, true);

    // Mark as read
    api(`/rooms/${activeRoom.id}/read/`, { method: "POST" }).catch(() => {});

    pollRef.current = setInterval(() => loadMessages(activeRoom), POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeRoom, loadMessages]);

  /* ── Focus input when room opens ── */
  useEffect(() => {
    if (activeRoom) setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeRoom]);

  /* ── Browser push notification helper ── */
  function triggerBrowserNotification(msg: ChatMessage, projectName: string) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(`${msg.sender_name} · ${projectName}`, {
        body: msg.message,
        icon: "/favicon.ico",
        tag:  `chat-${msg.id}`,
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(p => {
        if (p === "granted") {
          new Notification(`${msg.sender_name} · ${projectName}`, {
            body: msg.message,
            icon: "/favicon.ico",
            tag:  `chat-${msg.id}`,
          });
        }
      });
    }
  }

  /* ── Send message ── */
  const handleSend = async () => {
    if (!draft.trim() || !activeRoom || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      await api(`/rooms/${activeRoom.id}/messages/`, {
        method: "POST",
        body:   JSON.stringify({ message: text }),
      });
      // Optimistic: reload immediately
      await loadMessages(activeRoom);
    } catch {
      setDraft(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Open / close ── */
  const handleToggle = () => {
    setOpen(v => !v);
    if (!open) {
      setActiveRoom(null);
      setMessages([]);
      loadRooms();
    }
  };

  const handleBack = () => {
    setActiveRoom(null);
    setMessages([]);
    prevMsgIds.current = new Set();
    if (pollRef.current) clearInterval(pollRef.current);
    loadRooms();
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed bottom-6 right-6 z-50 font-mono select-none">

      {/* ── Chat panel ── */}
      {open && (
        <div className="mb-4 flex flex-col w-[360px] max-h-[560px] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-200">

          {/* Panel header */}
          <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 shrink-0">
            {activeRoom ? (
              <button
                onClick={handleBack}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/10">
                <MessageCircle className="h-4 w-4 text-orange-500" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black truncate">
                {activeRoom ? activeRoom.project_name : "Project Chat"}
              </p>
              {!activeRoom && (
                <p className="text-[10px] text-muted-foreground/50">
                  {rooms.length} project{rooms.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <button
              onClick={handleToggle}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Room list ── */}
          {!activeRoom && (
            <div className="flex-1 overflow-y-auto">
              {loadingRooms ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                </div>
              ) : rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-[14px] font-bold text-muted-foreground/50">No project chats yet</p>
                  <p className="mt-1 text-[12px] text-muted-foreground/30">
                    Chats are created for each project you're assigned to.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {rooms.map(room => (
                    <button
                      key={room.id}
                      onClick={() => setActiveRoom(room)}
                      className="group flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
                    >
                      {/* Project avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                        {initials(room.project_name)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold truncate group-hover:text-orange-500 transition-colors">
                          {room.project_name}
                        </p>
                        {room.last_message && (
                          <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5">
                            {room.last_message}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {room.last_at && (
                          <span className="text-[10px] text-muted-foreground/40">{fmtTime(room.last_at)}</span>
                        )}
                        {room.unread_count > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                            {room.unread_count > 99 ? "99+" : room.unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Message thread ── */}
          {activeRoom && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-[13px] font-bold text-muted-foreground/40">No messages yet</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/30">Start the conversation below.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const mine = msg.sender_name === user?.full_name;
                    const isManager = msg.sender_role === "project_manager" || msg.sender_role === "admin";
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex gap-2.5", mine ? "flex-row-reverse" : "flex-row")}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold self-end",
                          mine
                            ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                            : isManager
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                        )}>
                          {initials(msg.sender_name)}
                        </div>

                        {/* Bubble */}
                        <div className={cn("flex flex-col max-w-[75%]", mine && "items-end")}>
                          <div className={cn(
                            "flex items-center gap-2 mb-1",
                            mine ? "flex-row-reverse" : "flex-row"
                          )}>
                            <span className="text-[11px] font-bold text-foreground/80">{msg.sender_name}</span>
                            <span className="text-[10px] text-muted-foreground/40">{fmtTime(msg.created_at)}</span>
                          </div>
                          <div className={cn(
                            "rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed border",
                            mine
                              ? "bg-orange-500/10 border-orange-500/20 text-foreground rounded-tr-sm"
                              : "bg-muted/50 border-border rounded-tl-sm"
                          )}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div className="shrink-0 border-t border-border bg-background px-3 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… (Enter to send)"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-[13px] outline-none placeholder:text-muted-foreground/30 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10 transition-all max-h-28 overflow-y-auto"
                    style={{ minHeight: "40px" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white transition-all hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button
        onClick={handleToggle}
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-orange-500 text-white hover:bg-orange-600 hover:scale-105 active:scale-95",
          open && "rotate-0"
        )}
        aria-label="Toggle chat"
      >
        {open
          ? <X className="h-6 w-6" />
          : <MessageCircle className="h-6 w-6" />
        }

        {/* Unread badge */}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white shadow-sm animate-in zoom-in-75 duration-150">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}

        {/* Pulse ring when there are unread msgs */}
        {!open && totalUnread > 0 && (
          <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-20" />
        )}
      </button>
    </div>
  );
}