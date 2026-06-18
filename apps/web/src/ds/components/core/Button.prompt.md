The brand's button — verb-first labels, sentence case; reach for it for any committed action.

```jsx
<Button variant="primary" leftIcon="sparkles">Compose with AI</Button>
<Button variant="secondary" size="sm">Load more</Button>
<Button variant="ai" leftIcon="sparkles">Reply with AI</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="danger">Sign out</Button>
```

Variants: `primary` (electric blue, the default committed action), `secondary` (white + border), `ghost` (transparent, low emphasis), `danger` (red), `ai` (violet — reserve for genuine AI/agent actions). Sizes `sm`/`md`/`lg`. Props: `leftIcon`/`rightIcon` (Lucide names), `loading`, `fullWidth`, `disabled`. Press translates down 1px; focus shows the blue ring.
