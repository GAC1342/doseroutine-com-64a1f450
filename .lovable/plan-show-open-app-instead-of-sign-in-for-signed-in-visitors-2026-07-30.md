# Show "Open app" instead of "Sign in" for signed-in visitors

You're right — a signed-in user should never see a "Sign in" button on public pages. Right now the public library/marketing header always renders it, because it's a static link with no idea whether you have a session.

## What changes

- Add a small shared session hook that tells any public page whether someone is signed in (and keeps it fresh if they sign in or out in another tab).
- In the public header used across all library, guide, comparison and calculator pages: when signed in, replace the teal "Sign in" button with an "Open app" button that goes to `/today`. When signed out, nothing changes.
- Same treatment for the "Sign in" links on the home page header and CTA sections: signed-in visitors see "Open app" / "Go to my stack" instead.
- Avoid a flash: while the session is still loading on first paint, the button renders in a neutral state (no wrong label flashing).

## Technical notes

- New hook `src/hooks/use-session.ts`: `supabase.auth.getSession()` seeded via React Query plus an `onAuthStateChange` subscriber that updates the cached value. Client-only, safe for SSR (returns "unknown" until hydrated).
- `src/components/library-shell.tsx`: swap the hardcoded `<Link to="/auth">Sign in</Link>` for a session-aware button.
- `src/routes/index.tsx`: apply the same to its header and in-page CTAs. Its existing `beforeLoad` redirect to `/today` stays as-is.
- No backend, schema, or auth-flow changes.
