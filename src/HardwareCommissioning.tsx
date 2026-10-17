import {getUiLanguage,getUiLocale,trError,tr} from './i18n'
import {escapeHtml} from './customerLinks'
import {useMemo,useState} from 'react'
import {AlertTriangle,CheckCircle2,ClipboardCheck,Download,Landmark,Printer,ShieldCheck,Wifi} from 'lucide-react'
import type {PageKey,Role} from './types'

type ChecklistKey='station'|'printerInstalled'|'printerTest'|'receiptLayout'|'drawerConnected'|'drawerTest'|'dailyCash'|'fallback'
type DrawerMode='none'|'manual'|'printer-driver'
type PrinterConnection='system'|'usb'|'bluetooth'|'wifi'

type Props={
  role:Role
  staffName:string
  shopName:string
  online:boolean
  showToast:(message:string)=>void
  setPage:(page:PageKey)=>void
}

const read=(key:string,fallback='')=>localStorage.getItem(key)??fallback
const readBool=(key:string)=>localStorage.getItem(key)==='true'

export default function HardwareCommissioning({role,staffName,shopName,online,showToast,setPage}:Props){
  const[stationLabel,setStationLabel]=useState(()=>read('counternest.stationLabel'))
  const[printerMakeModel,setPrinterMakeModel]=useState(()=>read('counternest.printerMakeModel'))
  const[printerConnection,setPrinterConnection]=useState<PrinterConnection>(()=>{const saved=read('counternest.printerConnection');if(saved)return saved as PrinterConnection;const profile=read('counternest.printerProfile',read('chubbylu.printerProfile','system'));return ({'escpos-usb':'usb','escpos-bluetooth':'bluetooth','escpos-wifi':'wifi'}[profile]??'system') as PrinterConnection})
  const[paperWidth,setPaperWidth]=useState(()=>read('counternest.paperWidth',read('chubbylu.paperWidth','80')))
  const[drawerMode,setDrawerMode]=useState<DrawerMode>(()=>(read('counternest.drawerMode','none') as DrawerMode))
  const[drawerNotes,setDrawerNotes]=useState(()=>read('counternest.drawerNotes'))
  const[checklist,setChecklist]=useState<Record<ChecklistKey,boolean>>(()=>({
    station:readBool('counternest.hw.station'),
    printerInstalled:readBool('counternest.hw.printerInstalled'),
    printerTest:readBool('counternest.hw.printerTest'),
    receiptLayout:readBool('counternest.hw.receiptLayout'),
    drawerConnected:readBool('counternest.hw.drawerConnected'),
    drawerTest:readBool('counternest.hw.drawerTest'),
    dailyCash:readBool('counternest.hw.dailyCash'),
    fallback:readBool('counternest.hw.fallback'),
  }))
  const[lastCommissioned,setLastCommissioned]=useState(()=>read('counternest.hardwareCommissionedAt'))

  const requiredKeys=useMemo<ChecklistKey[]>(()=>{
    const base:ChecklistKey[]=['station','printerInstalled','printerTest','receiptLayout','dailyCash','fallback']
    if(drawerMode!=='none')base.splice(4,0,'drawerConnected','drawerTest')
    return base
  },[drawerMode])
  const ready=requiredKeys.every(k=>checklist[k])&&Boolean(stationLabel.trim())&&Boolean(printerMakeModel.trim())

  function toggle(key:ChecklistKey,value:boolean){setChecklist(old=>({...old,[key]:value}))}

  function save(){
    if(role!=='admin')return
    localStorage.setItem('counternest.stationLabel',stationLabel.trim())
    localStorage.setItem('counternest.printerMakeModel',printerMakeModel.trim())
    localStorage.setItem('counternest.printerConnection',printerConnection)
    localStorage.setItem('counternest.printerProfile',({usb:'escpos-usb',bluetooth:'escpos-bluetooth',wifi:'escpos-wifi',system:'system'} as const)[printerConnection])
    localStorage.setItem('counternest.paperWidth',paperWidth)
    localStorage.setItem('counternest.drawerMode',drawerMode)
    localStorage.setItem('counternest.drawerNotes',drawerNotes.trim())
    Object.entries(checklist).forEach(([k,v])=>localStorage.setItem(`counternest.hw.${k}`,String(v)))
    showToast(trError(tr("POS hardware setup saved on this workstation.")))
  }

  function printerTest(){
    const w=window.open('','_blank','width=420,height=720')
    if(!w)return showToast(trError(tr("Allow pop-ups to run the printer test.")))
    const width=paperWidth==='58'?'58mm':'80mm'
    const label=(source:string)=>escapeHtml(tr(source))
    const connection={system:'System Print / Windows driver',usb:'USB',bluetooth:'Bluetooth',wifi:'Wi-Fi / LAN'}[printerConnection]??'System Print / Windows driver'
    w.opener=null
    w.document.write(`<!doctype html><html lang="${getUiLanguage()}"><head><meta charset="utf-8"><title>${escapeHtml(shopName||'CounterNest POS')} • ${label('Printer Test')}</title><style>@page{size:${width} auto;margin:3mm}body{font-family:monospace;width:${width};margin:0;padding:3mm;box-sizing:border-box;text-align:center}hr{border:0;border-top:1px dashed #000}.left{text-align:left}</style></head><body><h3>${escapeHtml(shopName||'CounterNest POS')}</h3><b>${label('Printer Test')}</b><hr><div class="left">${label('Station')}: ${escapeHtml(stationLabel)||label('Not named')}<br>${label('Printer')}: ${escapeHtml(printerMakeModel)||label('Not entered')}<br>${label('Connection')}: ${label(connection)}<br>${label('Paper')}: ${escapeHtml(paperWidth)} mm<br>${label('Date')}: ${escapeHtml(new Date().toLocaleString(getUiLocale()))}</div><hr><p>${label('Confirm text is centered, readable, and fully inside the paper.')}</p><script>setTimeout(()=>window.print(),250)<\/script></body></html>`)
    w.document.close()
  }

  function drawerTest(){
    if(drawerMode==='none')return showToast(trError(tr("Select a cash-drawer mode first.")))
    if(drawerMode==='manual')return showToast(trError(tr("Manual/key drawer mode selected. Open the drawer manually and mark the test only after physical verification.")))
    const w=window.open('','_blank','width=360,height=500')
    if(!w)return showToast(trError(tr("Allow pop-ups to run the cash-drawer test.")))
    w.opener=null
    w.document.write(`<!doctype html><html lang="${getUiLanguage()}"><head><meta charset="utf-8"><title>${escapeHtml(shopName||'CounterNest POS')} • ${escapeHtml(tr('Cash Drawer Test'))}</title><style>@page{size:58mm auto;margin:2mm}body{font-family:monospace;width:58mm;text-align:center;margin:0;padding:2mm;box-sizing:border-box}</style></head><body><b>${escapeHtml(tr('Cash Drawer Test'))}</b><p>${escapeHtml(shopName||'CounterNest POS')}</p><p>${escapeHtml(new Date().toLocaleString(getUiLocale()))}</p><small>${escapeHtml(tr('If the printer driver is configured to open the connected cash drawer when a job prints, the drawer should open after this test.'))}</small><script>setTimeout(()=>window.print(),250)<\/script></body></html>`)
    w.document.close()
    showToast(trError(tr("Select the receipt printer. Mark the drawer test passed only if the physical drawer actually opens.")))
  }

  function record(){
    if(role!=='admin')return
    if(!ready)return showToast(trError(tr("Complete all required hardware checks before marking this station ready.")))
    save()
    const now=new Date().toISOString()
    localStorage.setItem('counternest.hardwareCommissionedAt',now)
    localStorage.setItem('counternest.hardwareCommissionedBy',staffName)
    setLastCommissioned(now)
    showToast(trError(tr("This POS station is marked ready for internal use.")))
  }

  function exportRecord(){
    const data={
      product:'CounterNest POS',phase:'34.2',station_label:stationLabel,shop_name:shopName,
      printer:{make_model:printerMakeModel,connection:printerConnection,paper_width_mm:Number(paperWidth)},
      cash_drawer:{mode:drawerMode,notes:drawerNotes},checklist,required_checks:requiredKeys,
      commissioned_at:lastCommissioned||null,commissioned_by:read('counternest.hardwareCommissionedBy')||null,
      current_url:window.location.origin,online
    }
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
    const a=document.createElement('a');a.href=url;a.download=`counternest-hardware-${(stationLabel||'station').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.json`;a.click();URL.revokeObjectURL(url)
  }

  const items:{key:ChecklistKey;label:string;detail:string;drawer?:boolean}[]=[
    {key:'station',label:'Workstation identified',detail:'Station has a clear label such as Front Counter 1.'},
    {key:'printerInstalled',label:'Receipt printer installed',detail:'Windows/Android can see and select the intended printer.'},
    {key:'printerTest',label:'Test receipt printed',detail:'A physical test receipt printed successfully.'},
    {key:'receiptLayout',label:'Receipt width verified',detail:tr('Receipt is readable and fits the selected {width} mm paper.').replace('{width}',paperWidth)},
    {key:'drawerConnected',label:'Cash drawer physically connected',detail:'Drawer is connected to the printer or available by manual key.',drawer:true},
    {key:'drawerTest',label:'Cash drawer opening verified',detail:'The selected opening method was physically tested.',drawer:true},
    {key:'dailyCash',label:'Daily Cash workflow verified',detail:'Management can enter opening cash, cash in/out, count and close the drawer.'},
    {key:'fallback',label:'Fallback procedure confirmed',detail:'Staff know how to continue if printer/drawer hardware is unavailable.'},
  ]

  return <>
    <header className="page-header"><div><h1>{tr("POS Hardware Setup")}</h1><p>{tr("receipt printer, cash drawer, and counter workstation verification")}</p></div><div className="report-actions"><button onClick={exportRecord}><Download size={17}/>{' '+tr("Export Record")}</button><button className="primary-btn" onClick={record} disabled={role!=='admin'||!ready}><CheckCircle2 size={17}/>{' '+tr("Mark Station Ready")}</button></div></header>
    <div className="info-box drawer-security"><ShieldCheck size={18}/><span>{tr('Hardware settings apply to this workstation. Browser printing uses your installed printer driver; test the receipt and cash drawer on this device.')}</span></div>
    {!online&&<div className="warning-box"><AlertTriangle size={18}/>{' '+tr("Supabase is currently offline. Hardware tests can still be performed, but Daily Cash verification requires the cloud connection.")}</div>}
    <section className="panel hardware-commission-summary">
      <div><strong>{tr("Station status")}</strong><span className={`commission-status ${ready?'ready':'pending'}`}>{ready?tr("READY FOR SIGN-OFF"):tr("SETUP IN PROGRESS")}</span></div>
      <div><strong>{tr("Last sign-off")}</strong><span>{lastCommissioned?new Date(lastCommissioned).toLocaleString(getUiLocale()):tr("Not yet commissioned")}</span></div>
      <div><strong>{tr("Connection")}</strong><span><Wifi size={15}/>{window.location.origin}</span></div>
    </section>
    <section className="panel"><h2><Printer size={20}/>{' '+tr("Receipt Printer")}</h2><div className="form-grid"><label>{tr("Station label")}<input value={stationLabel} onChange={e=>setStationLabel(e.target.value)} placeholder={tr("Front Counter 1")}/></label><label>{tr("Printer make / model")}<input value={printerMakeModel} onChange={e=>setPrinterMakeModel(e.target.value)} placeholder={tr("Example: Epson TM-T20III")}/></label><label>{tr("Connection")}<select value={printerConnection} onChange={e=>setPrinterConnection(e.target.value as PrinterConnection)}><option value="system">{tr("System Print / Windows driver")}</option><option value="usb">{tr("USB")}</option><option value="bluetooth">{tr("Bluetooth")}</option><option value="wifi">{tr("Wi-Fi / LAN")}</option></select></label><label>{tr("Paper width")}<select value={paperWidth} onChange={e=>setPaperWidth(e.target.value)}><option value="58">{tr("58 mm")}</option><option value="80">{tr("80 mm")}</option></select></label></div><div className="receipt-actions"><button className="primary-btn small" onClick={save} disabled={role!=='admin'}>{tr("Save Device Profile")}</button><button onClick={printerTest}><Printer size={17}/>{' '+tr("Print Test Receipt")}</button></div></section>
    <section className="panel"><h2><Landmark size={20}/>{' '+tr("Cash Drawer")}</h2><p className="muted">{tr("The accountable cash balance remains in Daily Cash. This section only verifies the physical drawer/opening method on this workstation.")}</p><div className="form-grid"><label>{tr("Drawer mode")}<select value={drawerMode} onChange={e=>setDrawerMode(e.target.value as DrawerMode)}><option value="none">{tr("No physical drawer installed")}</option><option value="manual">{tr("Manual / key opening")}</option><option value="printer-driver">{tr("Open through receipt-printer driver")}</option></select></label><label>{tr("Connection / notes")}<input value={drawerNotes} onChange={e=>setDrawerNotes(e.target.value)} placeholder={tr("RJ11/RJ12 to receipt printer, drawer model, etc.")}/></label></div><div className="receipt-actions"><button onClick={drawerTest} disabled={drawerMode==='none'}><Landmark size={17}/>{' '+tr("Test Drawer Opening")}</button><button onClick={()=>setPage('cash-drawer')}><ClipboardCheck size={17}/>{' '+tr("Open Daily Cash")}</button></div>{drawerMode==='printer-driver'&&<div className="info-box"><strong>{tr("Printer-driver mode:")}</strong>{' '+tr("configure the receipt printer driver to open the drawer when a print job/receipt is sent. The test button prints a small job; CounterNest does not claim the drawer opened until you physically verify it.")}</div>}</section>
    <section className="panel"><h2><ClipboardCheck size={20}/>{' '+tr("Hardware Acceptance Checklist")}</h2><div className="hardware-checklist">{items.filter(i=>!i.drawer||drawerMode!=='none').map(item=><label key={item.key} className={checklist[item.key]?'passed':''}><input type="checkbox" checked={checklist[item.key]} onChange={e=>toggle(item.key,e.target.checked)} disabled={role!=='admin'}/><span>{checklist[item.key]?<CheckCircle2 size={19}/>:<span className="check-placeholder"/>}<span><strong>{tr(item.label)}</strong><small>{tr(item.detail)}</small></span></span></label>)}</div><div className="info-box"><strong>{tr("Acceptance rule:")}</strong>{' '+tr("management marks a station ready only after the receipt and cash-drawer behavior is physically observed. Software configuration alone is not treated as proof.")}</div></section>
  </>
}
