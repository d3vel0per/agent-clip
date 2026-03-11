import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { ArrowLeft, Plus, Trash2, Pencil, BookOpen } from "lucide-react";
import { listSkills, getSkill, saveSkill, deleteSkill, type SkillInfo, type SkillDetail } from "../lib/agent";
import { useI18n } from "../lib/i18n";

interface SkillPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type View = "list" | "view" | "edit";

export function SkillPanel({ open, onOpenChange }: SkillPanelProps) {
  const { t } = useI18n();
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [view, setView] = useState<View>("list");
  const [current, setCurrent] = useState<SkillDetail | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const list = await listSkills();
      setSkills(list);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (open) {
      load();
      setView("list");
      setCurrent(null);
      setError(null);
    }
  }, [open]);

  const handleView = async (name: string) => {
    try {
      const detail = await getSkill(name);
      setCurrent(detail);
      setView("view");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (skill?: SkillDetail) => {
    if (skill) {
      setEditName(skill.name);
      setEditDesc(skill.description);
      setEditContent(skill.content);
      setIsNew(false);
    } else {
      setEditName("");
      setEditDesc("");
      setEditContent("");
      setIsNew(true);
    }
    setView("edit");
  };

  const handleSave = async () => {
    if (!editName.trim() || !editDesc.trim()) return;
    try {
      await saveSkill({ name: editName.trim(), description: editDesc.trim(), content: editContent });
      await load();
      setView("list");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteSkill(name);
      await load();
      if (current?.name === name) {
        setCurrent(null);
        setView("list");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-paper">
        <SheetHeader className="bg-surface">
          <div className="flex items-center gap-4">
            {view !== "list" && (
              <button onClick={() => setView("list")} className="p-1 hover:bg-surface-hover transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <SheetTitle>
              {view === "list" && t("Skills")}
              {view === "view" && current?.name}
              {view === "edit" && (isNew ? t("New Skill") : t("Edit Skill"))}
            </SheetTitle>
            <div className="flex-1" />
            {view === "list" && (
              <button className="p-2 border border-ink hover:bg-ink hover:text-paper transition-all" onClick={() => handleEdit()}>
                <Plus className="h-4 w-4" />
              </button>
            )}
            {view === "view" && current && (
              <button className="p-2 border border-ink hover:bg-ink hover:text-paper transition-all" onClick={() => handleEdit(current)}>
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </SheetHeader>

        {error && (
          <div className="px-6 py-2 text-[10px] font-mono font-bold text-urgent bg-urgent/5 border-b border-urgent uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        <ScrollArea className="flex-1">
          {view === "list" && (
            <div className="p-0 flex flex-col">
              {skills.length === 0 ? (
                <div className="text-center py-20 px-8">
                  <h2 className="text-3xl font-serif font-bold mb-4">{t("No skills yet")}</h2>
                  <p className="text-sm text-muted italic font-serif leading-relaxed max-w-[240px] mx-auto border-t border-border pt-4">
                    {t("Skills are reusable instructions that help me handle complex tasks.")}
                  </p>
                </div>
              ) : (
                skills.map((s) => (
                  <button
                    key={s.name}
                    className="group relative flex items-start gap-4 p-6 border-b border-border hover:bg-surface-hover transition-colors text-left"
                    onClick={() => handleView(s.name)}
                  >
                    <div className="w-10 h-10 border border-border flex items-center justify-center shrink-0 group-hover:border-ink transition-colors">
                      <BookOpen className="w-5 h-5 text-muted group-hover:text-ink" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="signature-label text-ink truncate">{s.name}</div>
                      <div className="text-[12px] text-muted mt-1 line-clamp-2 leading-relaxed font-serif italic">{s.description}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.name); }}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-urgent/10 text-urgent transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </button>
                ))
              )}
            </div>
          )}

          {view === "view" && current && (
            <div className="p-8 space-y-10">
              <div className="space-y-4">
                <h3 className="signature-label text-muted">Description</h3>
                <p className="text-lg font-serif italic text-ink leading-relaxed border-l border-border pl-6">{current.description}</p>
              </div>
              <div className="space-y-4">
                <h3 className="signature-label text-muted">Instruction Set</h3>
                <pre className="font-mono text-[13px] leading-relaxed p-6 border border-border bg-surface whitespace-pre-wrap">
                  {current.content}
                </pre>
              </div>
            </div>
          )}

          {view === "edit" && (
            <div className="p-8 space-y-10">
              <div className="space-y-4">
                <label className="signature-label text-muted">Symbolic Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="deploy-api"
                  className="font-mono text-[14px] h-10 border border-border bg-surface font-bold"
                  disabled={!isNew}
                />
              </div>
              <div className="space-y-4">
                <label className="signature-label text-muted">Brief Description</label>
                <Input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="One sentence to describe purpose and triggers"
                  className="text-[14px] h-10 border border-border bg-surface"
                />
              </div>
              <div className="space-y-4">
                <label className="signature-label text-muted">Implementation Logic</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Describe the skill instructions in Markdown..."
                  className="w-full min-h-[400px] border border-border bg-surface px-4 py-4 text-[13px] font-mono leading-relaxed resize-none focus:outline-none focus:border-ink transition-colors"
                />
              </div>
              <Button onClick={handleSave} disabled={!editName.trim() || !editDesc.trim()} className="w-full h-12">
                {isNew ? t("Initialize Skill") : t("Save Changes")}
              </Button>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
