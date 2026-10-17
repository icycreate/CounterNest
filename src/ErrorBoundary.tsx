import {tr} from './i18n'
import {Component,type ErrorInfo,type ReactNode} from 'react'

type State={error:Error|null;reference:string}
export default class ErrorBoundary extends Component<{children:ReactNode},State>{
  state:State={error:null,reference:''}
  static getDerivedStateFromError(error:Error):State{return{error,reference:`UI-${new Date().toISOString().replace(/\D/g,'').slice(0,14)}`} }
  componentDidCatch(error:Error,info:ErrorInfo){
    try{const existing=JSON.parse(localStorage.getItem('counternest.uiErrors')||'[]') as unknown[];existing.unshift({reference:this.state.reference,message:error.message,componentStack:info.componentStack,at:new Date().toISOString()});localStorage.setItem('counternest.uiErrors',JSON.stringify(existing.slice(0,20)))}catch{/* Storage failure must not hide the recovery screen. */}
  }
  render(){if(!this.state.error)return this.props.children;return <main className="fatal-error"><section className="panel"><small>{tr("COUNTERNEST RECOVERY")}</small><h1>{tr("The POS screen encountered an error")}</h1><p>{tr("No sale is assumed complete unless a receipt was created. Record the reference below, reconnect if necessary, then reload the application.")}</p><code>{this.state.reference}</code><details><summary>{tr("Technical detail")}</summary><pre>{this.state.error.message}</pre></details><button className="primary-btn" onClick={()=>window.location.reload()}>{tr("Reload CounterNest")}</button></section></main>}
}
