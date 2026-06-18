The workspace surface — white, 14px radius, hairline border, soft layered shadow. No colored left-border accents.

```jsx
<Card>Message content…</Card>
<Card tone="ai">AI thread summary…</Card>
<Card hoverable onClick={open}>Thread row…</Card>
```

`tone="ai"` gives the faint blue wash used behind AI summaries; `hoverable` lifts the shadow for clickable cards; `tone="sunken"` for inset gray areas.
