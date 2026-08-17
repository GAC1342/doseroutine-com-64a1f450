import { useEffect } from "react";

/**
 * Browsers mutate the value of a focused `<input type="number">` when the user
 * scrolls the wheel/trackpad over it, or presses Up/Down. That silently turns a
 * typed 900 into 899. This guard blocks both across the whole app for any
 * remaining native number inputs.
 *
 * New dose fields should use `<DecimalInput>` (text + inputMode="decimal"),
 * which has no spinner behaviour to guard against in the first place.
 */
export function useNumberInputWheelGuard() {
  useEffect(() => {
    function isNumberInput(el: Element | null): el is HTMLInputElement {
      return !!el && el.tagName === "INPUT" && (el as HTMLInputElement).type === "number";
    }

    function onWheel(event: WheelEvent) {
      const active = document.activeElement;
      if (!isNumberInput(active)) return;
      if (event.target !== active) return;
      // Blur first so the browser has no focused spinner to act on, then
      // cancel the mutation itself. Page scrolling continues normally.
      active.blur();
      if (event.cancelable) event.preventDefault();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      if (!isNumberInput(event.target as Element)) return;
      event.preventDefault();
    }

    // Non-passive so preventDefault is honoured.
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}
