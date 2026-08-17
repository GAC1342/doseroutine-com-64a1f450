import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PairNote = Database["public"]["Tables"]["user_pair_notes"]["Row"];
type NoteSeverity = "info" | "caution" | "avoid";

export const PAIR_NOTES_QK = ["user-pair-notes"] as const;

export function normalizePair(aId: string, bId: string) {
  return aId < bId ? { a: aId, b: bId } : { a: bId, b: aId };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  existing?: PairNote | null;
};

export function PairNoteDialog({ open, onOpenChange, aId, bId, aName, bName, existing }: Props) {
  const qc = useQueryClient();
  const [severity, setSeverity] = useState<NoteSeverity>("caution");
  const [note, setNote] = useState("");
  const [source, setSource] = useState("");

  useEffect(() => {
    if (open) {
      setSeverity((existing?.severity as NoteSeverity) ?? "caution");
      setNote(existing?.note ?? "");
      setSource(existing?.source ?? "");
    }
  }, [open, existing]);

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = note.trim();
      if (!trimmed) throw new Error("Note is required");
      if (trimmed.length > 500) throw new Error("Note must be 500 characters or fewer");
      const { a, b } = normalizePair(aId, bId);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const payload = {
        user_id: uid,
        compound_a_id: a,
        compound_b_id: b,
        severity,
        note: trimmed,
        source: source.trim() ? source.trim().slice(0, 500) : null,
      };
      const { error } = await supabase
        .from("user_pair_notes")
        .upsert(payload, { onConflict: "user_id,compound_a_id,compound_b_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAIR_NOTES_QK });
      toast.success("Note saved");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!existing) return;
      const { error } = await supabase.from("user_pair_notes").delete().eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAIR_NOTES_QK });
      toast.success("Note deleted");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {aName} <span className="text-muted-foreground">+</span> {bName}
          </DialogTitle>
          <DialogDescription>
            Your private note about this pair. Only you can see it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pn-sev">How would you rate it?</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as NoteSeverity)}>
              <SelectTrigger id="pn-sev">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info — just a heads-up</SelectItem>
                <SelectItem value="caution">Caution — worth watching</SelectItem>
                <SelectItem value="avoid">Avoid — don't combine</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pn-note">Note</Label>
            <Textarea
              id="pn-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="What did your clinician or research say about this pair?"
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">{note.length}/500</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pn-src">Source (optional)</Label>
            <Input
              id="pn-src"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Dr. Smith, PubMed link, etc."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {existing ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => remove.mutate()}
              disabled={remove.isPending || save.isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending || !note.trim()}
            >
              {save.isPending ? "Saving…" : "Save note"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
