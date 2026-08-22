/**
 * Native-feeling confirmation dialog.
 *
 * Replaces browser `confirm()`, which renders a system alert titled with the
 * site URL inside the iOS webview — jarring in an installed app and flagged by
 * Apple review (Guideline 4.2). `useConfirm()` keeps the same call shape:
 *
 *   const [confirm, confirmUi] = useConfirm();
 *   if (await confirm({ title: "Delete this?" })) doIt();
 *   return <>{confirmUi}...</>;
 */
import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }, []);

  const ui = (
    <AlertDialog
      open={options !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title ?? ""}</AlertDialogTitle>
          {/* Always rendered so Radix always has an accessible description,
              even when a call site omits one. */}
          <AlertDialogDescription>
            {options?.description ??
              (options?.destructive === false
                ? "Confirm to continue, or cancel to go back."
                : "This can't be undone. Confirm to continue, or cancel to go back.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* min-h-11 keeps both actions at Apple's 44pt minimum tap target. */}
          <AlertDialogCancel className="min-h-11" onClick={() => settle(false)}>
            {options?.cancelLabel ?? "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settle(true)}
            className={
              options?.destructive === false
                ? "min-h-11"
                : "min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }
          >
            {options?.confirmLabel ?? "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirm, ui];
}
