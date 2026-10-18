import type {ReactNode} from 'react'
export function EmptyState({title,description,icon,actions}:{title:ReactNode;description?:ReactNode;icon?:ReactNode;actions?:ReactNode}){return <div className="empty-state cn-empty-state">{icon&&<span aria-hidden="true">{icon}</span>}<strong>{title}</strong>{description&&<p>{description}</p>}{actions&&<div>{actions}</div>}</div>}
