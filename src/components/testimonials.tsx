import { Quote } from "lucide-react";
import alexanderPhoto from "@/assets/testimonial-alexander.jpg.asset.json";
import danPhoto from "@/assets/testimonial-dan.jpg.asset.json";

type Entry = {
  photo: string;
  alt: string;
  quote: string;
  name: string;
  meta: string;
};

const ENTRIES: Entry[] = [
  {
    photo: alexanderPhoto.url,
    alt: "Alexander D., DoseRoutine user, at the gym",
    quote:
      "With three compounds in my protocol — TRT, retatrutide, tesamorelin — I wanted more than memory and a calendar. DoseRoutine tracks each dose and flags anything in my stack worth asking my doctor about.",
    name: "Alexander D.",
    meta: "· Canada",
  },
  {
    photo: danPhoto.url,
    alt: "Dan, DoseRoutine tester, wearing a red shirt and cap",
    quote:
      "Caught an interaction between my magnesium and thyroid med I had no idea about.",
    name: "Dan",
    meta: "· testing since June",
  },
];

/**
 * Real-person social proof — real users, real photos.
 * Keep it honest: no invented user counts, no stock faces.
 */
export function Testimonials({ className = "" }: { className?: string }) {
  return (
    <section
      aria-label="What people say about DoseRoutine"
      data-testid="testimonials"
      className={`mx-auto grid max-w-3xl gap-4 sm:grid-cols-2 ${className}`}
    >
      {ENTRIES.map((e) => (
        <figure
          key={e.name}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <img
            src={e.photo}
            alt={e.alt}
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            className="h-16 w-16 shrink-0 rounded-2xl object-cover"
          />
          <div className="min-w-0">
            <Quote className="h-5 w-5 text-primary" aria-hidden="true" />
            <blockquote className="mt-2 text-base leading-relaxed text-foreground">
              “{e.quote}”
            </blockquote>
            <figcaption className="mt-3 text-sm font-semibold text-muted-foreground">
              {e.name} <span className="font-normal">{e.meta}</span>
            </figcaption>
          </div>
        </figure>
      ))}
    </section>
  );
}
