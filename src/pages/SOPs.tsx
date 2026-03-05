import { useState, useEffect } from "react";
import { Search, ChevronRight, BookOpen, Loader2, X, Paperclip } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/EmptyState";
import type { SOP, SOPAttachment } from "@/types/database";

export default function SOPs() {
  const [search, setSearch] = useState("");
  const [sops, setSops] = useState<SOP[]>([]);
  const [attachmentsBySop, setAttachmentsBySop] = useState<Record<string, SOPAttachment[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedSop, setSelectedSop] = useState<SOP | null>(null);

  useEffect(() => {
    async function fetchSOPs() {
      setLoading(true);
      const { data, error } = await supabase
        .from("sops")
        .select("*")
        .order("sort_order");

      if (error) {
        setLoading(false);
        return;
      }
      if (data) {
        const nextSops = data as SOP[];
        setSops(nextSops);
        await hydrateAttachments(nextSops);
      }
      setLoading(false);
    }
    fetchSOPs();
  }, []);

  async function hydrateAttachments(sourceSops: SOP[]) {
    if (sourceSops.length === 0) {
      setAttachmentsBySop({});
      return;
    }
    const ids = sourceSops.map((s) => s.id);
    const { data } = await (supabase
      .from("sop_attachments") as any)
      .select("*")
      .in("sop_id", ids)
      .order("created_at");
    const grouped: Record<string, SOPAttachment[]> = {};
    for (const item of (data as SOPAttachment[]) || []) {
      if (!grouped[item.sop_id]) grouped[item.sop_id] = [];
      grouped[item.sop_id].push(item);
    }
    setAttachmentsBySop(grouped);
  }

  // Group by category
  const categories: Record<string, SOP[]> = {};
  for (const sop of sops) {
    const cat = sop.category || "Uncategorized";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(sop);
  }

  const filteredCategories = Object.entries(categories).filter(
    ([cat, items]) =>
      !search ||
      cat.toLowerCase().includes(search.toLowerCase()) ||
      items.some((s: SOP) => s.title.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-24">
      {/* Header */}
      <div className="space-y-4 mb-6 sticky top-0 bg-sundown-bg z-10 pt-2 pb-2">
        <h1 className="text-xl font-bold text-sundown-text">
          Standard Operating Procedures
        </h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sundown-muted" />
          <input
            type="text"
            placeholder="Search SOPs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 border border-sundown-border bg-sundown-card text-sundown-text placeholder:text-sundown-muted focus:outline-none focus:border-sundown-gold transition-colors"
          />
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No SOPs Found"
          description={
            search
              ? `No SOPs found matching "${search}".`
              : "No standard operating procedures have been created yet."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredCategories.map(([category, items]) => (
            <Card
              key={category}
              className="rounded-none active:scale-[0.99] transition-transform cursor-pointer border-sundown-border hover:border-sundown-gold/50"
              onClick={() =>
                setExpandedCategory(
                  expandedCategory === category ? null : category
                )
              }
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sundown-bg border border-sundown-border flex items-center justify-center text-blue-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sundown-text">
                      {category}
                    </h3>
                    <p className="text-xs text-sundown-muted">
                      {(items as SOP[]).length} document{(items as SOP[]).length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-sundown-muted transition-transform ${
                      expandedCategory === category ? "rotate-90" : ""
                    }`}
                  />
                </div>

                {expandedCategory === category && (
                  <div className="mt-4 pl-16 space-y-2 border-t border-sundown-border pt-3">
                    {(items as SOP[]).map((sop) => (
                      <button
                        key={sop.id}
                        className="w-full text-sm text-sundown-text py-1 text-left hover:text-sundown-gold"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSop(sop);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {sop.title}
                            <span className="text-xs text-sundown-muted ml-2">
                              v{sop.version}
                            </span>
                          </span>
                          {(attachmentsBySop[sop.id]?.length || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-sundown-muted">
                              <Paperclip className="w-3 h-3" />
                              {attachmentsBySop[sop.id]?.length}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedSop && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl border border-sundown-border bg-sundown-card">
            <div className="p-4 border-b border-sundown-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-sundown-text">{selectedSop.title}</h3>
                <p className="text-sm text-sundown-muted">{selectedSop.category} · v{selectedSop.version}</p>
              </div>
              <button onClick={() => setSelectedSop(null)} className="text-sundown-muted hover:text-sundown-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[65vh] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-sans text-sundown-text">
                {selectedSop.content || "(No SOP content yet.)"}
              </pre>
              {(attachmentsBySop[selectedSop.id]?.length || 0) > 0 && (
                <div className="mt-5 pt-4 border-t border-sundown-border space-y-2">
                  <p className="text-xs text-sundown-muted uppercase tracking-wide">Attachments</p>
                  {attachmentsBySop[selectedSop.id].map((att) => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-sundown-gold hover:underline truncate"
                    >
                      {att.file_name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
