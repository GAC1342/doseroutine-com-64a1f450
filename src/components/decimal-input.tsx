import { forwardRef } from "react";
import { sanitizeDecimalInput } from "@/lib/dose-input";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * A numeric field that cannot be changed by anything except typing.
 *
 * It renders `type="text"` with `inputMode="decimal"`, so mobile still gets the
 * number pad but the browser's spinner behavior — wheel scroll and Up/Down
 * arrows silently incrementing a focused field — simply does not exist. Input
 * is sanitised to a plain decimal on every keystroke.
 */
export const DecimalInput = forwardRef<HTMLInputElement, Props>(function DecimalInput(
  { value, onValueChange, onPaste, ...rest },
  ref,
) {
  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onValueChange(sanitizeDecimalInput(e.target.value))}
      onPaste={(e) => {
        const text = e.clipboardData.getData("text");
        const cleaned = sanitizeDecimalInput(text);
        if (cleaned !== text) {
          e.preventDefault();
          onValueChange(cleaned);
        }
        onPaste?.(e);
      }}
    />
  );
});
