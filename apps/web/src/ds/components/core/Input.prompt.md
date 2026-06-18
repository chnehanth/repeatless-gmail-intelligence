Text input with optional label, hint, error, and a leading Lucide icon; the search box and all draft fields use it.

```jsx
<Input label="Subject" placeholder="Search subjects" leftIcon="search" />
<Input label="To" defaultValue="ana@acme.com" />
<Input label="Email" error="That doesn't look right" />
```

Focus shows the blue ring; `error` turns the border red and swaps in the message. Use `size="sm"` for toolbar/inline search.
