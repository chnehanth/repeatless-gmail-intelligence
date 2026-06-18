Ask-AI chat bubble. User messages are electric-blue and right-aligned; assistant answers are left-aligned under the violet Repeatless AI mark, and can render a typing indicator or attach SourceCards in the footer.

```jsx
<ChatBubble role="user">Which companies rejected my application?</ChatBubble>
<ChatBubble role="assistant" footer={<SourceList/>}>Based on 3 emails, two companies declined…</ChatBubble>
<ChatBubble role="assistant" typing />
```
