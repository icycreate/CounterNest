import {Capacitor,registerPlugin} from '@capacitor/core'
export const isAndroid=()=>Capacitor.getPlatform()==='android'
export const SecureSession=registerPlugin<{get(options:{key:string}):Promise<{value:string|null}>;set(options:{key:string,value:string}):Promise<void>;remove(options:{key:string}):Promise<void>;bind(options:{user:string}):Promise<void>;appearance(options:{dark:boolean}):Promise<void>}>('SecureSession')
export const nativeAuthStorage={getItem:async(key:string)=>(await SecureSession.get({key})).value,setItem:async(key:string,value:string)=>{await SecureSession.set({key,value})},removeItem:async(key:string)=>{await SecureSession.remove({key})}}
