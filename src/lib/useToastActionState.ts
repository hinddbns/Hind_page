import { useActionState } from "react";
import type { ActionState } from "@/app/(app)/admin/actions";
import { toast } from "@/lib/toast";

/** Wraps a `ConfirmActionForm`/admin-form Server Action so a successful
 * result always surfaces via the global toast — instead of an inline
 * success message tied to the mutating component's own mount state, which
 * can be unmounted by the very re-render the action's `revalidatePath`
 * triggers (e.g. approving an enrollment removes the "Approve" button).
 *
 * `onSuccess` (e.g. collapsing an edit panel) runs inline as part of the
 * action's own resolution rather than in a `useEffect` on `state.ok` — this
 * keeps the state update tied to the event that caused it instead of a
 * passive effect, and avoids the "setState synchronously within an effect"
 * lint rule for a state change that's really a direct response to the
 * action completing. */
export function useToastActionState(
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>,
  successMessage?: string,
  onSuccess?: () => void
) {
  async function wrapped(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const result = await action(prevState, formData);
    if (result.ok) {
      if (successMessage) toast.success(successMessage);
      onSuccess?.();
    } else if (result.error) {
      toast.error(result.error);
    }
    return result;
  }

  return useActionState(wrapped, {});
}
