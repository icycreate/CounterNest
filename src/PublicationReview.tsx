import {Button} from './Button'
import {tr,useUiLanguage} from './i18n'
import {useDialogFocus} from './useDialogFocus'

/** Confirmation only. Each editor retains its own revision, media bucket and save RPC. */
export function PublicationReview({section,images,onCancel,onPublish}:{section:string;images:number;onCancel:()=>void;onPublish:()=>void}){
 useUiLanguage()
 const dialog=useDialogFocus(onCancel)
 return <div className="modal-backdrop"><section ref={dialog} className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="publication-title">
  <h2 id="publication-title">{tr('Review publication')}</h2>
  <p><strong>{tr(section)}</strong></p>
  <p>{tr('Images in this section')}: {images}</p>
  <p>{tr('Publishing makes this section available to customers immediately, using its current visibility settings. Other editors are saved separately.')}</p>
  <p>{tr('Check each language in Preview before publishing. Empty translations use the configured fallback.')}</p>
  <div className="modal-actions"><Button type="button" variant="secondary" onClick={onCancel}>{tr('Back to editing')}</Button><Button type="button" variant="primary" onClick={onPublish}>{tr('Publish changes')}</Button></div>
 </section></div>
}
