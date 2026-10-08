"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";

/** Submit button that disables itself while its form's server action runs. */
export function SubmitButton({
  children,
  pendingLabel,
  confirmMessage,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string; confirmMessage?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      onClick={confirmMessage ? (e) => !window.confirm(confirmMessage) && e.preventDefault() : undefined}
      {...props}
    >
      {pending ? (pendingLabel ?? "…") : children}
    </Button>
  );
}
