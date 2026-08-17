import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buildShareUrl, shareIntentUrl, nativeShare, type SharePlatform } from "@/lib/share";

const PLATFORMS: { key: SharePlatform; label: string }[] = [
  { key: "x", label: "X / Twitter" },
  { key: "facebook", label: "Facebook" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "telegram", label: "Telegram" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "reddit", label: "Reddit" },
];

export function ShareDoseRoutine({
  path = "/",
  campaign = "user_share",
  variant = "outline",
  size = "sm",
  label = "Share DoseRoutine",
}: {
  path?: string;
  campaign?: string;
  variant?: "outline" | "default" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = buildShareUrl("copy", path, campaign);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function tryNative() {
    const ok = await nativeShare(path);
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Share2 className="w-4 h-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share DoseRoutine</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button onClick={tryNative} className="w-full">
              Share via device
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((p) => (
              <a
                key={p.key}
                href={shareIntentUrl(p.key, path)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border px-3 py-2 text-sm hover:bg-accent text-center"
              >
                {p.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-md border p-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent text-xs outline-none"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button size="sm" variant="ghost" onClick={copyLink} className="gap-1">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Links include UTM tags so you can see which channel drives sign-ups.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
