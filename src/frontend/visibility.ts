import { useCallback, useRef, useState, useSyncExternalStore, type RefCallback } from 'react';

interface SubscribableSnapshot<T> {
  get:()=>T;
  subscribe:(listener:()=>void)=>(()=>void);
}

/** Termix owns host-list virtualization. A single shared observer prevents one
 * IntersectionObserver instance per mounted badge; only subscriptions to OUR
 * stores are gated outside the viewport (with a 160px prefetch margin).
 */
let sharedObserver: IntersectionObserver | null = null;
const observed = new Map<Element, (near:boolean)=>void>();
function observe(element:Element, notify:(near:boolean)=>void):()=>void {
  if(typeof IntersectionObserver === 'undefined') { notify(true); return ()=>{}; }
  if(!sharedObserver){
    sharedObserver=new IntersectionObserver(entries=>{
      for(const entry of entries) observed.get(entry.target)?.(entry.isIntersecting);
    },{rootMargin:'160px 0px',threshold:0});
  }
  observed.set(element,notify);
  sharedObserver.observe(element);
  return ()=>{
    observed.delete(element);
    sharedObserver?.unobserve(element);
    if(observed.size===0){sharedObserver?.disconnect();sharedObserver=null;}
  };
}
/** Start visible: never render an empty badge on the first paint. */
export function useBadgeVisibility():{near:boolean;badgeRef:RefCallback<HTMLSpanElement>} {
  const [near,setNear]=useState(true);
  const cleanup=useRef<(()=>void)|null>(null);
  const badgeRef=useCallback((element:HTMLSpanElement|null)=>{
    cleanup.current?.();
    cleanup.current=element?observe(element,setNear):null;
    // A disabled/hidden badge no longer has an observed DOM element. Reset
    // visibility so it remains subscribed to global appearance updates and
    // can be re-enabled without remounting the parent host row.
    if(!element)setNear(true);
  },[]);
  return {near,badgeRef};
}
/** When hidden, retain the last snapshot; resubscribe and refresh on return. */
export function useVisibleSnapshot<T>(store:SubscribableSnapshot<T>,near:boolean):T {
  const last=useRef(store.get());
  const getSnapshot=useCallback(()=>{
    if(near)last.current=store.get();
    return last.current;
  },[store,near]);
  const subscribe=useCallback((listener:()=>void)=>near?store.subscribe(listener):()=>{},[store,near]);
  return useSyncExternalStore(subscribe,getSnapshot,getSnapshot);
}
