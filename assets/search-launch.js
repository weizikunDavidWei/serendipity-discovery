// Only the pending ending needs an observable accepted popup. noopener makes
// window.open return null even on success, so first open our own blank tab.
export function openConfirmedSearch(url){
 let tab;
 try{
  tab=window.open('about:blank','_blank');if(!tab)return false;
  tab.opener=null;
  const meta=tab.document.createElement('meta');meta.name='referrer';meta.content='no-referrer';tab.document.head.append(meta);
  const link=tab.document.createElement('a');link.href=url;link.rel='noreferrer noopener';link.referrerPolicy='no-referrer';tab.document.body.append(link);link.click();return true;
 }catch{try{tab?.close()}catch{}return false}
}
