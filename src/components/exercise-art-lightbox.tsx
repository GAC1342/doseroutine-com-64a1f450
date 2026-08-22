import { useCallback, useId, useRef, useState, cloneElement, isValidElement } from "react";
import { exerciseArt, exerciseArtAlt, EXERCISE_ART_SIZE } from "@/lib/exercise-art";
import { warmImage, useWarmOnIntentRef } from "@/lib/image-warm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type OpenFn = (trigger?: HTMLElement | null) => void;

export function ExerciseArtLightbox({
  exercise,
  label,
  children,
}: {
  exercise: string | null | undefined;
  /** Display name to announce instead of the matched illustration name. */
  label?: string;
  children: React.ReactNode | ((props: { onOpen: OpenFn }) => React.ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const captionId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const art = exerciseArt(exercise);

  const onOpen = useCallback((trigger?: HTMLElement | null) => {
    if (trigger) triggerRef.current = trigger;
    setOpen(true);
  }, []);

  // Always hand focus back to the element that opened the dialog. If that
  // element has since been unmounted (list re-render), fall back to the body
  // so focus never gets stranded on a detached node.
  const onCloseAutoFocus = useCallback(
    (event: Event) => {
      const trigger = triggerRef.current;
      if (trigger && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
        event.preventDefault();
      }
    },
    [triggerRef],
  );

  // Esc is handled by Radix; "z" (zoom) closes as well so the same key that
  // opened the illustration from the trigger also dismisses it.
  const onDialogKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key.toLowerCase() === "z" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      setOpen(false);
    }
  }, []);

  if (!art) {
    return <>{typeof children === "function" ? children({ onOpen: () => {} }) : children}</>;
  }

  const name = (label ?? exercise ?? "Exercise").trim();
  const baseAlt = exerciseArtAlt(exercise);
  const alt =
    label && label.trim() && label.trim().toLowerCase() !== (exercise ?? "").trim().toLowerCase()
      ? `${name}: ${baseAlt}`
      : baseAlt;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {typeof children === "function" ? (
        children({ onOpen })
      ) : (
        <TriggerWrapper open={open} onOpen={onOpen} triggerRef={triggerRef} src={art}>
          {children}
        </TriggerWrapper>
      )}
      <DialogContent
        className="max-h-[100svh] max-w-2xl overflow-y-auto p-0 sm:max-h-[calc(100svh-2rem)] sm:p-0"
        // Name the dialog by REFERENCE (aria-labelledby -> the real
        // DialogTitle) rather than aria-label. A referenced title is the one
        // pattern every screen reader handles the same way: VoiceOver, TalkBack,
        // NVDA and JAWS all announce it on entry, and it keeps Radix's own
        // labeling contract and the exposed name from drifting apart — with a
        // bare aria-label the hidden title was a competing, unannounced name.
        aria-labelledby={`${captionId}-title`}
        // Described by the visible caption text, so the anatomical detail is
        // read exactly once on entry (and again only if the user swipes to it).
        aria-describedby={`${captionId}-desc`}
        aria-keyshortcuts="Escape Z"
        // Radix guards focus and inerts the background, but it does not emit
        // aria-modal. Without it VoiceOver's rotor and TalkBack's swipe can
        // still wander into the page behind, so state it explicitly.
        aria-modal="true"
        // Test hook: the dialog is now named by reference, so specs must not
        // key off an aria-label attribute that no longer exists.
        data-art-dialog={name}
        // Explicit close-button name: "Close" alone is ambiguous when several
        // dialogs/illustrations exist on one screen.
        closeLabel={`Close ${name} illustration`}
        onKeyDown={onDialogKeyDown}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={() => setOpen(false)}
      >
        {/*
          Visually hidden but exposed: this element IS the dialog's accessible
          name via aria-labelledby above, so it is announced exactly once.
        */}
        <DialogHeader className="sr-only">
          <DialogTitle id={`${captionId}-title`}>{name} illustration, full size</DialogTitle>
        </DialogHeader>

        <figure className="flex min-h-0 flex-col items-center p-4 sm:p-6">
          {/*
            Intrinsic width/height + a 1:1 aspect-ratio box reserve the exact
            space before the bitmap decodes, so the dialog never reflows.
            The file is the same one the thumbnail already loaded, so this is
            normally an instant cache hit; `eager` + high priority covers the
            case where the modal is opened before the thumbnail finished.
          */}
          <img
            src={art}
            // The caption below carries the same text and is the dialog's
            // description, so the image itself is decorative to a screen
            // reader; labeling it too would read the sentence three times.
            alt=""
            aria-hidden="true"
            width={EXERCISE_ART_SIZE}
            height={EXERCISE_ART_SIZE}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            // The box is derived purely from CSS (square aspect ratio capped by
            // the viewport), never from the decoded bitmap, so a slow network
            // cannot reflow the caption when the image finally lands.
            className="aspect-square w-full max-w-[min(70svh,calc(100svh-12rem))] rounded-lg object-contain"
          />
          <figcaption className="mt-4 text-center">
            <span id={`${captionId}-label`} className="block text-sm font-medium">
              {name}
            </span>
            <span id={`${captionId}-desc`} className="mt-1 block text-xs text-muted-foreground">
              {alt}
            </span>
            <span className="mt-2 block text-xs text-muted-foreground">
              Press <kbd className="rounded border border-border px-1">Esc</kbd> or{" "}
              <kbd className="rounded border border-border px-1">Z</kbd> to close.
            </span>
          </figcaption>
        </figure>
      </DialogContent>
    </Dialog>
  );
}

type TriggerChildProps = {
  ref?: React.Ref<HTMLElement>;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  onPointerEnter?: (e: React.PointerEvent<HTMLElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
  "aria-haspopup"?: "dialog";
  "aria-expanded"?: boolean;
  "aria-keyshortcuts"?: string;
};

function TriggerWrapper({
  open,
  children,
  onOpen,
  triggerRef,
  src,
}: {
  open: boolean;
  children: React.ReactNode;
  onOpen: OpenFn;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  /** Full-size illustration to warm before the dialog is opened. */
  src?: string;
}) {
  // Native, capture-phase, passive listeners on the trigger itself. On iOS
  // Safari this is the only pre-tap warming signal that exists (no hover), and
  // it beats React's delegated onTouchStart by a full bubble.
  const warmRef = useWarmOnIntentRef(src);
  const child = isValidElement<React.ReactElement<TriggerChildProps>>(children)
    ? (children as React.ReactElement<TriggerChildProps>)
    : null;
  if (!child) return <>{children}</>;

  const childRef =
    (child.props as TriggerChildProps).ref ??
    (child as unknown as { ref?: React.Ref<HTMLElement> }).ref;
  const setRef = (node: HTMLElement | null) => {
    warmRef(node);
    if (typeof childRef === "function") childRef(node);
    else if (childRef && typeof childRef === "object")
      (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
  };

  return cloneElement(child, {
    ref: setRef,
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    // Enter/Space come free with the <button>; "z" is the extra zoom shortcut.
    "aria-keyshortcuts": "Enter Space Z",
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key.toLowerCase() === "z" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        warmImage(src);
        triggerRef.current = e.currentTarget;
        onOpen(e.currentTarget);
      }
      child.props.onKeyDown?.(e);
    },
    // Hover/focus is the earliest reliable signal of intent; warming here is
    // what makes the dialog paint its image on the first frame.
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      warmImage(src);
      child.props.onPointerEnter?.(e);
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      warmImage(src);
      child.props.onFocus?.(e);
    },
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      warmImage(src);
      triggerRef.current = e.currentTarget;
      onOpen(e.currentTarget);
      child.props.onClick?.(e);
    },
  });
}

export function ExerciseArtThumbnail({
  exercise,
  label,
  size = 36,
  className = "",
  priority = false,
}: {
  exercise: string | null | undefined;
  /** Display name to announce instead of the matched illustration name. */
  label?: string;
  size?: number;
  className?: string;
  /**
   * Set on thumbnails that are visible without scrolling (e.g. the single
   * reference row in the workout sheet). Those load eagerly so the modal is
   * warm the moment the row appears; grid/list thumbnails stay lazy.
   */
  priority?: boolean;
}) {
  const art = exerciseArt(exercise);
  // Hooks must run before the early return below.
  const warmRef = useWarmOnIntentRef(art);
  if (!art) return null;

  const name = (label ?? exercise ?? "Exercise").trim();
  const alt = exerciseArtAlt(exercise);

  const img = (
    <img
      src={art}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      className={`shrink-0 rounded-md border border-border bg-background object-cover ${className}`}
      style={{ width: size, height: size, aspectRatio: "1 / 1" }}
    />
  );

  return (
    <ExerciseArtLightbox exercise={exercise} label={label}>
      <button
        type="button"
        ref={warmRef}
        className="tap-target shrink-0 cursor-zoom-in rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={`Enlarge ${name} illustration. ${alt}. Press Enter or Z to open, Escape to close.`}
        title={`Enlarge ${name} illustration (Z)`}
        // Intent warming is bound natively (capture + passive) by the
        // lightbox trigger wrapper, so touchstart on iOS wins the race with
        // the synthesised click instead of trailing React's delegation.
      >
        {img}
      </button>
    </ExerciseArtLightbox>
  );
}
