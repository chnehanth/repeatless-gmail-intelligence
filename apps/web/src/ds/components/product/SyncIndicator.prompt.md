The live sync block at the bottom of the sidebar — a pulsing status dot (green synced / blue syncing / red error), monospace thread + message counts, and a refresh button. Built for the dark sidebar (light text on translucent surface).

```jsx
<SyncIndicator status="syncing" threadCount={1240} messageCount={312} onRefresh={sync} />
<SyncIndicator status="error" error="req_8fa2 · token expired" onRefresh={sync} />
```

The dot pulses only while syncing; honors reduced-motion.
