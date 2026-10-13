import { Modal } from 'antd'
import type { ModalFuncProps } from 'antd'

/** Shared look for every confirmation popup: left-aligned bold title with a close (X) button, plain body
 *  text, and Cancel + action buttons on the right. Styles: `.kv-confirm` in theme.scss. */
export const confirmOptions: ModalFuncProps = {
  className: 'kv-confirm',
  icon: null,
  closable: true,
  centered: true,
  width: 480,
  cancelText: 'Cancel',
}

/** Opens a confirmation popup. Always use this (not `modal.confirm` from `App.useApp()`) so every confirmation
 *  is rendered the same way: `confirmDialog({ title, content, okText, onOk })`. */
export const confirmDialog = (props: ModalFuncProps) => Modal.confirm({ ...confirmOptions, ...props })
