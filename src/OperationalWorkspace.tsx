import {useState} from 'react'
import {Button} from './Button'
import {tr} from './i18n'
import {WorkspaceRecovery,WorkspaceHealth} from './WorkspaceRecovery'
import {SetupWizard,ImportTools,PermissionPresets} from './OperationsSetup'
import type {PageKey} from './types'
export default function OperationalWorkspace({shopName,onNavigate}:{shopName:string;onNavigate:(p:PageKey)=>void}){const[tab,setTab]=useState('setup');return <><header className="page-header"><h1>{tr('Workspace')}</h1></header><nav className="ops-tabs" aria-label={tr('Workspace sections')}>{[['backup','Backup & Restore'],['setup','Business Setup'],['import','Import Tools'],['permissions','Permission Presets'],['health','System Health']].map(([key,label])=><Button key={key} variant={tab===key?'primary':'secondary'} aria-pressed={tab===key} onClick={()=>setTab(key)}>{tr(label)}</Button>)}</nav>{tab==='backup'&&<WorkspaceRecovery embedded shopName={shopName}/>} {tab==='setup'&&<SetupWizard onNavigate={onNavigate}/>} {tab==='import'&&<ImportTools/>} {tab==='permissions'&&<PermissionPresets/>} {tab==='health'&&<WorkspaceHealth/>}</>}
