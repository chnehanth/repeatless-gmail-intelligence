/**
 * Barrel for the Repeatless Design System components vendored under src/ds.
 *
 * Each component ships as a `.jsx` implementation plus a `.d.ts` type
 * declaration. Imports here omit the extension on purpose: TypeScript resolves
 * the `.d.ts` (types) while Vite resolves the `.jsx` (runtime). The component
 * bodies are plain React with self-injecting CSS that reads the design tokens
 * from `ds/styles.css`.
 */

// Core primitives
export { Avatar } from './components/core/Avatar';
export { Badge } from './components/core/Badge';
export { Button } from './components/core/Button';
export { Card } from './components/core/Card';
export { Checkbox } from './components/core/Checkbox';
export { Dialog } from './components/core/Dialog';
export { EmptyState } from './components/core/EmptyState';
export { Icon } from './components/core/Icon';
export { IconButton } from './components/core/IconButton';
export { Input } from './components/core/Input';
export { Skeleton } from './components/core/Skeleton';
export { Switch } from './components/core/Switch';
export { Tabs } from './components/core/Tabs';

// Product components
export { CategoryBadge } from './components/product/CategoryBadge';
export { ChatBubble } from './components/product/ChatBubble';
export { SourceCard } from './components/product/SourceCard';
export { SyncIndicator } from './components/product/SyncIndicator';
export { ThreadRow } from './components/product/ThreadRow';
export { ToneSelector } from './components/product/ToneSelector';

export type { IconName } from './components/core/Icon';

// Logo assets (Vite resolves these to URL strings).
export { default as wordmark } from './assets/repeatless-wordmark.svg';
export { default as wordmarkInverse } from './assets/repeatless-wordmark-inverse.svg';
export { default as iconMark } from './assets/repeatless-icon.svg';
