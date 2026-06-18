import * as React from 'react';

export interface ToneSelectorProps {
  /** Tone options. Default: Professional, Friendly, Concise, Formal. */
  options?: string[];
  /** Controlled value. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  onChange?: (value: string) => void;
}

/** Segmented control for picking an AI draft tone in Compose / Reply. */
export function ToneSelector(props: ToneSelectorProps): JSX.Element;
