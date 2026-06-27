// Runs synchronously during HTML parse on hard loads to set the theme class
// before first paint (FOUC prevention). Rendering a constant <script> — identical
// on server and client — avoids a hydration attribute mismatch (previously the
// `type` flipped text/javascript ↔ text/plain across environments). React does
// not re-execute a dangerouslySetInnerHTML script on the client, and the body is
// idempotent (reads localStorage, toggles the `dark` class) even if it ever did.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
