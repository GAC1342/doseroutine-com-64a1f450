import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { EDITORIAL_AUTHOR } from "@/lib/editorial-author";

/** Compact byline shown directly under the headline. */
export function EditorialByline({ published, updated }: { published: string; updated: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      By the{" "}
      <Link to="/about" className="font-medium text-foreground hover:underline">
        {EDITORIAL_AUTHOR.name}
      </Link>{" "}
      · <time dateTime={published}>Published {published}</time> ·{" "}
      <time dateTime={updated}>Last reviewed {updated}</time> ·{" "}
      <Link to="/editorial-policy" className="text-primary hover:underline">
        How we review content
      </Link>
    </p>
  );
}

/** Full "About the author" card rendered near the end of a post. */
export function EditorialAboutCard() {
  return (
    <Card className="p-5 space-y-3" aria-labelledby="about-the-author">
      <h2 id="about-the-author" className="text-lg font-semibold">
        About the author
      </h2>
      <p className="text-sm font-medium text-foreground">
        {EDITORIAL_AUTHOR.name} — {EDITORIAL_AUTHOR.role}
      </p>
      <p className="text-sm text-muted-foreground">{EDITORIAL_AUTHOR.who}</p>
      <p className="text-sm text-muted-foreground">{EDITORIAL_AUTHOR.what}</p>
      <p className="text-sm text-muted-foreground">{EDITORIAL_AUTHOR.limits}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <li>
          <Link to="/sources" className="text-primary hover:underline">
            Sources &amp; methodology
          </Link>
        </li>
        <li>
          <Link to="/editorial-policy" className="text-primary hover:underline">
            Editorial &amp; review policy
          </Link>
        </li>
        <li>
          <Link to="/about" className="text-primary hover:underline">
            About DoseRoutine
          </Link>
        </li>
        <li>
          <a
            href={`mailto:${EDITORIAL_AUTHOR.contactEmail}`}
            className="text-primary hover:underline"
          >
            Report a correction by email
          </a>
        </li>
      </ul>
    </Card>
  );
}
