import { Quote } from "lucide-react";
import alexanderPhoto from "@/assets/testimonial-alexander.jpg.asset.json";
import danPhoto from "@/assets/testimonial-dan.jpg.asset.json";
import alexander128 from "@/assets/testimonial-alexander-128.webp.asset.json";
import alexander192 from "@/assets/testimonial-alexander-192.webp.asset.json";
import dan128 from "@/assets/testimonial-dan-128.webp.asset.json";
import dan192 from "@/assets/testimonial-dan-192.webp.asset.json";

type Entry = {
  photo: string;
  /** WebP candidates sized for the 64px slot (1x/2x/3x). */
  webpSrcSet: string;
  alt: string;
  quote: string;
  name: string;
  meta: string;
};

const ENTRIES: Entry[] = [
  {
    photo: alexanderPhoto.url,
    webpSrcSet: `${alexander128.url} 128w, ${alexander192.url} 192w`,
    alt: "Alexander D., DoseRoutine user, at the gym",
    quote:
      "With three compounds in my protocol — TRT, retatrutide, tesamorelin — I wanted more than memory and a calendar. DoseRoutine tracks each dose and flags anything in my stack worth asking my doctor about.",
    name: "Alexander D.",
    meta: "· Canada",
  },
  {
    photo: danPhoto.url,
    webpSrcSet: `${dan128.url} 128w, ${dan192.url} 192w`,
    alt: "Dan, DoseRoutine tester, wearing a red shirt and cap",
    quote: "Caught an interaction between my magnesium and thyroid med I had no idea about.",
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
          {...{ itemscope: "" }}
          {...{ itemtype: "https://schema.org/Review" }}
        >
          <picture>
            <source type="image/webp" srcSet={e.webpSrcSet} sizes="64px" />
            <img
              src={e.photo}
              alt={e.alt}
              title={e.alt}
              width={96}
              height={96}
              sizes="64px"
              loading="lazy"
              decoding="async"
              className="h-16 w-16 shrink-0 rounded-2xl object-cover"
            />
          </picture>
          <div className="min-w-0">
            <Quote className="h-5 w-5 text-primary" aria-hidden="true" />
            <blockquote
              className="mt-2 text-base leading-relaxed text-foreground"
              {...{ itemprop: "reviewBody" }}
            >
              “{e.quote}”
            </blockquote>
            <figcaption
              className="mt-3 text-sm font-semibold text-muted-foreground"
              {...{ itemprop: "author" }}
              {...{ itemscope: "" }}
              {...{ itemtype: "https://schema.org/Person" }}
            >
              <span {...{ itemprop: "name" }}>{e.name}</span>{" "}
              <span className="font-normal">{e.meta}</span>
            </figcaption>
          </div>
        </figure>
      ))}
    </section>
  );
}
