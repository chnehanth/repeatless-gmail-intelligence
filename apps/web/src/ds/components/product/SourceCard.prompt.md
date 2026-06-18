The `[S#]` citation card — the visual embodiment of the brand promise. Every AI answer renders these so the user can trace the claim back to the exact source email; clicking opens that thread.

```jsx
<SourceCard index={1} subject="Re: Application status" sender="Acme Talent" date="Mar 4" onClick={openThread} />
```

The monospace `S#` tag matches the citation references inline in the answer text. Lay several out in a wrapping flex row in a ChatBubble footer.
