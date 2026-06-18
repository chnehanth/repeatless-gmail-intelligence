import * as React from 'react';

export interface TabItem {
  value: string;
  label: string;
  /** Optional monospace count shown after the label. */
  count?: number;
}

export interface TabsProps {
  /** Tabs as {value,label,count} objects (or plain strings). */
  tabs: (TabItem | string)[];
  /** Controlled active value. */
  value?: string;
  /** Initial active value when uncontrolled. */
  defaultValue?: string;
  /** Fires with the newly selected value. */
  onChange?: (value: string) => void;
  className?: string;
}

/** Underline tabs — used for inbox views and settings sections. */
export function Tabs(props: TabsProps): JSX.Element;
