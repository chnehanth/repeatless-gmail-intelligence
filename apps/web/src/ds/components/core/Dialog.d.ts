import * as React from 'react';

export interface DialogProps {
  /** Visibility. Default true. */
  open?: boolean;
  /** Called on scrim click or close button. */
  onClose?: () => void;
  /** Title text. */
  title?: string;
  /** Sub-line under the title. */
  subtitle?: string;
  /** Footer node — typically right-aligned Buttons. */
  footer?: React.ReactNode;
  /** Max width override (px). Default 520. */
  width?: number;
  children?: React.ReactNode;
}

/** Centered modal with scrim, blur, and rise-in. Base for Compose/Reply. */
export function Dialog(props: DialogProps): JSX.Element | null;
