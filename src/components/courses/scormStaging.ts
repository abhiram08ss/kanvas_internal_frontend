import { api } from '../../api'
import type { ScormSelection } from './ScormUpload'

/** Delete a package uploaded in this form session (`fileName` is only set for those) that is no longer wanted.
 * A package already attached to the course is left alone. Best effort: anything missed is purged after 24h. */
export function discardIfStaged(selection: ScormSelection | null, keepalive = false) {
  if (selection?.fileName) void api.discardScorm(selection.packageId, keepalive).catch(() => {})
}
