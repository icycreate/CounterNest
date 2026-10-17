import {tr} from './i18n'
/** Keep stable legacy RPC and history identifiers out of operational labels. */
export function userFacingText(text: string) {
  return tr(text.replace(/\bPhases?\s+\d+(?:\.\d+)*(?:\s*[–—-]\s*\d+(?:\.\d+)*)?(?:\s*[—–:]\s*)?/gi,'').trim())
}
