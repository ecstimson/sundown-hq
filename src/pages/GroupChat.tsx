import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { ChatMessage } from "@/types/database";

export default function GroupChat() {
  const { employee } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => Boolean(employee && draft.trim().length > 0), [employee, draft]);

  async function fetchMessages() {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);

    if (fetchErr) {
      setError(fetchErr.message);
    }
    setMessages((data as ChatMessage[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("group-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function sendMessage() {
    if (!employee || !draft.trim()) return;
    setError(null);
    const { error: sendErr } = await supabase.from("chat_messages").insert({
      author_id: employee.id,
      author_name: employee.name,
      body: draft.trim(),
    } as any);
    if (sendErr) {
      setError(sendErr.message);
      return;
    }
    setDraft("");
  }

  return (
    <div className="h-[calc(100vh-10rem)]">
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b border-sundown-border">
          <CardTitle>Group Chat</CardTitle>
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
                    <div key={msg.id} className="rounded-md border border-sundown-border bg-sundown-bg p-3">
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
                  <div className="rounded-md border border-sundown-red/30 bg-sundown-red/10 p-2 text-xs text-sundown-red">
                    {error}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 h-11 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
                  />
                  <Button onClick={sendMessage} disabled={!canSend} className="gap-2">
                    <Send className="w-4 h-4" />
                    Send
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

