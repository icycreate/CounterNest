import {EmptyState} from './EmptyState'
import {isValidElement,useState} from 'react'
import type {ReactNode} from 'react'
import {SearchField} from './SearchField'
import {tr} from './i18n'
function cellText(value:ReactNode):string{if(value==null||typeof value==='boolean')return '';if(typeof value==='string'||typeof value==='number')return String(value);if(Array.isArray(value))return value.map(cellText).join(' ');if(isValidElement<{children?:ReactNode}>(value))return cellText(value.props.children);return ''}
/** Searches visible text, never serializes callbacks, records or private props. */
export function RecordTable({headers,rows}:{headers:string[];rows:ReactNode[][]}){
 const[query,setQuery]=useState('');const shown=rows.filter(row=>!query.trim()||row.map(cellText).join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <><div className="no-print record-search"><SearchField value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr('Search records')}/></div><div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{tr(h)}</th>)}</tr></thead><tbody>{shown.length?shown.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>):<tr><td colSpan={headers.length}><EmptyState title={tr('No matching results.')}/></td></tr>}</tbody></table></div></>
}
