import { Link } from "@tanstack/react-router";

export function DisclaimerFooter({
  variant = "default",
}: {
  variant?: "default" | "safety" | "plan";
}) {
  const copy =
    variant === "safety"
      ? "Educational, not medical advice. Talk to a licensed clinician before combining or changing what you take."
      : variant === "plan"
        ? "Suggestions only. DoseRoutine is educational and not a substitute for professional medical advice."
        : "Educational, not medical advice. Consult a qualified clinician before changing any regimen.";
  return (
    <p className="mt-8 px-2 text-center text-xs leading-relaxed text-muted-foreground">
      {copy}{" "}
      <Link to="/legal" className="underline underline-offset-2 hover:text-foreground">
        Terms, privacy & disclaimer
      </Link>
      .
    </p>
  );
}
