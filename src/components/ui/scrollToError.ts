/**
 * After a failed validation, bring the first invalid field of a form into view (and focus it), so the user
 * doesn't have to hunt for it in a long, scrolling popup. Call it right after the errors have been set; the short
 * delay lets React render the error markers first.
 */
export function scrollToFirstError(form: HTMLElement | null) {
  if (!form) return
  window.setTimeout(() => {
    const target = form.querySelector<HTMLElement>(
      '.ant-input-status-error, .ant-input-affix-wrapper-status-error, .ant-select-status-error, [data-field-error]',
    )
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const focusable = target.matches('input, textarea') ? target : target.querySelector<HTMLElement>('input, textarea')
    focusable?.focus({ preventScroll: true })
  }, 60)
}
