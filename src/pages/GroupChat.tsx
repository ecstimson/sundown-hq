import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Send, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { ChatMessage } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

export default function GroupChat() {
  const { employee } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const canSend = useMemo(
    () => Boolean(employee && draft.trim().length > 0 && !sending),
    [employee, draft, sending]
  );

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (fetchErr) {
      setError(fetchErr.message);
      setLoading(false);
      return;
    }
    setMessages(((data as ChatMessage[]) || []).reverse());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("group-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const incoming = payload.new as ChatMessage;
        setMessages((prev) =>
          prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
        );
      })
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeConnected(false);
          console.error("Realtime subscription error:", err);
        } else if (status === "CLOSED") {
          setRealtimeConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function sendMessage() {
    if (!employee || !draft.trim() || sending) return;
    setSending(true);
    setError(null);
    const body = draft.trim();
    setDraft("");

    const { data: inserted, error: sendErr } = await supabase
      .from("chat_messages")
      .insert({ author_id: employee.id, author_name: employee.name, body } as any)
      .select()
      .single();

    setSending(false);

    if (sendErr) {
      setDraft(body); // restore draft so user can retry
      setError(sendErr.message);
      return;
    }

    // Optimistically append; Realtime deduplication will skip if it fires too
    if (inserted) {
      setMessages((prev) =>
        prev.some((m) => m.id === (inserted as ChatMessage).id)
          ? prev
          : [...prev, inserted as ChatMessage]
      );
    }
  }

  return (
    <div className="h-[calc(100vh-12rem)] lg:h-[calc(100vh-10rem)]">
      <Card className="h-full flex flex-col rounded-none">
        <CardHeader className="border-b border-sundown-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Group Chat</CardTitle>
              {!loading && !realtimeConnected && (
                <span className="flex items-center gap-1 text-xs text-sundown-muted" title="Live updates unavailable — use refresh">
                  <WifiOff className="w-3 h-3" />
                </span>
              )}
            </div>
            {!loading && (
              <button
                onClick={fetchMessages}
                className="text-sundown-muted hover:text-sundown-text transition-colors p-1"
                title="Refresh messages"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-sundown-muted">No messages yet. Start the conversation.</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="border border-sundown-border bg-sundown-bg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-sundown-text">{msg.author_name}</p>
                        <p className="text-xs text-sundown-muted">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <p className="text-sm text-sundown-text mt-1 whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-sundown-border p-3 space-y-2">
                {error && (
                  <div className="border border-sundown-red/30 bg-sundown-red/10 p-2 text-xs text-sundown-red flex items-center justify-between gap-2">
                    <span>{error}</span>
                    <button
                      onClick={() => setError(null)}
                      className="shrink-0 text-sundown-red hover:opacity-70"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (canSend) sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="flex-1 h-11 px-3 border border-sundown-border bg-sundown-bg text-sundown-text disabled:opacity-60"
                  />
                  <Button onClick={sendMessage} disabled={!canSend} className="gap-2 min-w-[4.5rem]">
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

