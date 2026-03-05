import { useState, useEffect, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Search, Plus, FileText, Eye, Edit, Loader2, BookOpen, X, Trash2, Paperclip, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth";
import type { SOP, SOPAttachment } from "@/types/database";

export default function SOPManager() {
  const { employee } = useAuth();
  const [sops, setSops] = useState<SOP[]>([]);
  const [attachmentsBySop, setAttachmentsBySop] = useState<Record<string, SOPAttachment[]>>({});
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeSOP, setActiveSOP] = useState<SOP | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", category: "", content: "" });
  const [createTemplate, setCreateTemplate] = useState("Opening Procedures");
  const [customSopName, setCustomSopName] = useState("");

  const SOP_TEMPLATES = [
    { title: "Opening Procedures", category: "Operations" },
    { title: "Feeding Schedule", category: "Feeding" },
    { title: "Feeding Schedule - Calcium Rotation", category: "Feeding" },
    { title: "Closing Procedures", category: "Operations" },
    { title: "Health Check Protocol", category: "Health" },
    { title: "Cleaning and Sanitation", category: "Husbandry" },
    { title: "Photo and Listing Workflow", category: "Sales" },
  ];

  useEffect(() => {
    async function fetchSOPs() {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from("sops")
        .select("*")
        .order("sort_order");
      if (fetchErr) {
        setError(fetchErr.message);
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

  const categories = ["All Categories", ...new Set(sops.map((s) => s.category))];

  const filtered = sops.filter((sop) => {
    const matchSearch =
      !search ||
      sop.title.toLowerCase().includes(search.toLowerCase()) ||
      sop.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "All Categories" || sop.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  async function refreshSOPs() {
    const { data, error: refreshErr } = await supabase.from("sops").select("*").order("sort_order");
    if (refreshErr) {
      setError(refreshErr.message);
      return;
    }
    if (data) {
      const nextSops = data as SOP[];
      setSops(nextSops);
      await hydrateAttachments(nextSops);
    }
  }

  async function hydrateAttachments(sourceSops: SOP[]) {
    if (sourceSops.length === 0) {
      setAttachmentsBySop({});
      return;
    }
    const ids = sourceSops.map((s) => s.id);
    const { data, error: attachmentErr } = await (supabase
      .from("sop_attachments") as any)
      .select("*")
      .in("sop_id", ids)
      .order("created_at");
    if (attachmentErr) {
      setError(attachmentErr.message);
      return;
    }
    const grouped: Record<string, SOPAttachment[]> = {};
    for (const item of (data as SOPAttachment[]) || []) {
      if (!grouped[item.sop_id]) grouped[item.sop_id] = [];
      grouped[item.sop_id].push(item);
    }
    setAttachmentsBySop(grouped);
  }

  async function loadAttachmentsForSop(sopId: string) {
    const { data, error: attachmentErr } = await (supabase
      .from("sop_attachments") as any)
      .select("*")
      .eq("sop_id", sopId)
      .order("created_at");
    if (attachmentErr) {
      setError(attachmentErr.message);
      return;
    }
    setAttachmentsBySop((prev) => ({ ...prev, [sopId]: (data as SOPAttachment[]) || [] }));
  }

  function openView(sop: SOP) {
    setActiveSOP(sop);
    setShowViewModal(true);
    void loadAttachmentsForSop(sop.id);
  }

  async function createFromTemplate() {
    setSaving(true);
    setError(null);
    const template = SOP_TEMPLATES.find((t) => t.title === createTemplate);
    if (!template) {
      setSaving(false);
      return;
    }

    const { error: insertErr } = await supabase.from("sops").insert({
      title: customSopName.trim() || template.title,
      category: template.category,
      content: "",
      sort_order: sops.length + 1,
      version: 1,
    } as any);
    if (insertErr) {
      setError(insertErr.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setShowCreateModal(false);
    await refreshSOPs();
  }

  async function deleteSOP(sop: SOP) {
    if (!confirm(`Delete "${sop.title}"? This cannot be undone.`)) return;
    const { error: delErr } = await supabase.from("sops").delete().eq("id", sop.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setSops((prev) => prev.filter((s) => s.id !== sop.id));
    setAttachmentsBySop((prev) => {
      const next = { ...prev };
      delete next[sop.id];
      return next;
    });
    if (activeSOP?.id === sop.id) {
      setActiveSOP(null);
      setShowViewModal(false);
      setShowEditModal(false);
    }
  }

  function beginEdit(sop: SOP) {
    setActiveSOP(sop);
    setEditForm({ title: sop.title, category: sop.category, content: sop.content || "" });
    setShowEditModal(true);
    void loadAttachmentsForSop(sop.id);
  }

  async function handleAttachmentUpload(e: ChangeEvent<HTMLInputElement>) {
    if (!activeSOP || !e.target.files?.length) return;
    const file = e.target.files[0];
    setError(null);
    setUploading(true);

    const safeName = file.name.replace(/\s+/g, "-");
    const path = `sop-attachments/${activeSOP.id}/${Date.now()}-${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from("sop-files")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadErr) {
      setError(`Upload failed: ${uploadErr.message}`);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("sop-files").getPublicUrl(path);
    const fileUrl = urlData?.publicUrl || path;

    const { error: insertErr } = await (supabase
      .from("sop_attachments") as any)
      .insert({
        sop_id: activeSOP.id,
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: employee?.id ?? null,
      });

    if (insertErr) {
      setError(`Attachment save failed: ${insertErr.message}`);
      setUploading(false);
      return;
    }

    e.target.value = "";
    setUploading(false);
    await loadAttachmentsForSop(activeSOP.id);
  }

  async function deleteAttachment(attachment: SOPAttachment) {
    const { error: deleteErr } = await supabase.from("sop_attachments").delete().eq("id", attachment.id);
    if (deleteErr) {
      setError(deleteErr.message);
      return;
    }
    if (activeSOP) await loadAttachmentsForSop(activeSOP.id);
  }

  async function saveEdit() {
    if (!activeSOP) return;
    setSaving(true);
    setError(null);
    const { error: updateErr } = await (supabase
      .from("sops") as any)
      .update({
        title: editForm.title,
        category: editForm.category,
        previous_version_content: activeSOP.content,
        content: editForm.content,
        version: activeSOP.version + 1,
      } as any)
      .eq("id", activeSOP.id);
    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setShowEditModal(false);
    setActiveSOP(null);
    await refreshSOPs();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sundown-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-sundown-red/30 bg-sundown-red/10 p-3 text-sm text-sundown-red">
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-sundown-text">SOP Library</h1>
          <p className="text-sundown-muted text-sm">
            Manage standard operating procedures
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" /> Create New SOP
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sundown-muted" />
          <input
            type="text"
            placeholder="Search SOPs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-sundown-border bg-sundown-card text-sm text-sundown-text focus:outline-none focus:ring-1 focus:ring-sundown-gold"
        >
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* SOP Grid */}
      {filtered.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sop) => (
            <Card
              key={sop.id}
              className="group hover:border-sundown-gold/50 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-sundown-bg border border-sundown-border flex items-center justify-center text-sundown-muted group-hover:text-sundown-gold transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-sundown-muted hover:text-sundown-text"
                      onClick={() => openView(sop)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-sundown-muted hover:text-sundown-text"
                      onClick={() => beginEdit(sop)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-sundown-muted hover:text-sundown-red"
                      onClick={() => deleteSOP(sop)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="mt-3 text-lg">{sop.title}</CardTitle>
                <CardDescription>{sop.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-sundown-muted pt-3 border-t border-sundown-border">
                  <span>Version {sop.version}</span>
                  {(attachmentsBySop[sop.id]?.length || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      {attachmentsBySop[sop.id]?.length}
                    </span>
                  ) : null}
                  <span>
                    Updated{" "}
                    {new Date(sop.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-sundown-border bg-sundown-card">
            <div className="p-5 border-b border-sundown-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-sundown-text">Create SOP From Template</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-sundown-muted hover:text-sundown-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <select
                value={createTemplate}
                onChange={(e) => setCreateTemplate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              >
                {SOP_TEMPLATES.map((template) => (
                  <option key={template.title} value={template.title}>{template.title}</option>
                ))}
              </select>
              <p className="text-xs text-sundown-muted">
                Creates title and category from the template. Content is intentionally blank so you can edit later.
              </p>
              <input
                type="text"
                placeholder="Custom SOP name (optional)"
                value={customSopName}
                onChange={(e) => setCustomSopName(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
            </div>
            <div className="p-5 border-t border-sundown-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={createFromTemplate} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create SOP
              </Button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && activeSOP && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-sundown-border bg-sundown-card">
            <div className="p-5 border-b border-sundown-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-sundown-text">{activeSOP.title}</h3>
                <p className="text-sm text-sundown-muted">{activeSOP.category} · v{activeSOP.version}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowViewModal(false); beginEdit(activeSOP); }}
                  className="text-sundown-muted hover:text-sundown-text p-1"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteSOP(activeSOP)}
                  className="text-sundown-muted hover:text-sundown-red p-1"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setShowViewModal(false)} className="text-sundown-muted hover:text-sundown-text p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-5 max-h-[65vh] overflow-y-auto">
              <pre className="text-sm text-sundown-text whitespace-pre-wrap font-sans">
                {activeSOP.content || "(Blank content — edit to fill this SOP.)"}
              </pre>
              {(attachmentsBySop[activeSOP.id]?.length || 0) > 0 && (
                <div className="mt-5 pt-4 border-t border-sundown-border space-y-2">
                  <p className="text-xs text-sundown-muted uppercase tracking-wide">Attachments</p>
                  {attachmentsBySop[activeSOP.id].map((att) => (
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

      {showEditModal && activeSOP && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-sundown-border bg-sundown-card">
            <div className="p-5 border-b border-sundown-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-sundown-text">Edit SOP</h3>
              <button onClick={() => setShowEditModal(false)} className="text-sundown-muted hover:text-sundown-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <input
                value={editForm.category}
                onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <textarea
                value={editForm.content}
                onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Write SOP content..."
                className="w-full min-h-64 px-3 py-2 rounded-md border border-sundown-border bg-sundown-bg text-sundown-text"
              />
              <div className="space-y-2">
                <label className="text-xs text-sundown-muted uppercase tracking-wide">Attachments</label>
                <input
                  type="file"
                  onChange={handleAttachmentUpload}
                  accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.webp,.gif,.heic"
                  className="text-xs text-sundown-muted file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-sundown-gold/20 file:text-sundown-text"
                />
                {uploading && (
                  <div className="text-xs text-sundown-muted inline-flex items-center gap-1">
                    <Upload className="w-3 h-3 animate-pulse" /> Uploading attachment...
                  </div>
                )}
                {(attachmentsBySop[activeSOP.id]?.length || 0) > 0 && (
                  <div className="space-y-1 pt-1">
                    {attachmentsBySop[activeSOP.id].map((att) => (
                      <div key={att.id} className="flex items-center justify-between gap-3 text-sm">
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sundown-gold hover:underline truncate"
                        >
                          {att.file_name}
                        </a>
                        <button
                          type="button"
                          onClick={() => deleteAttachment(att)}
                          className="text-sundown-muted hover:text-sundown-red"
                          title="Delete attachment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-sundown-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={saveEdit} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
