The inbox list row — avatar, subject, AI summary preview (2-line clamp), message-count pill, relative date, and category badge. Unread rows get a bold subject and a blue left rail.

```jsx
<ThreadRow sender="Stripe" subject="Your March invoice is ready"
  summary="Invoice #4821 for $240 is available. Auto-pay runs Mar 28."
  date="2h" messageCount={3} category="Finance" unread onClick={open} />
```

Pass empty `summary` to show the "Summary pending…" enriching state.
