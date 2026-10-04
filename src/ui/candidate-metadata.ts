/** Coalesced snapshots; provider scheduler supplies rate limits. Bounded tab memory. */
export class CandidateMetadata<T> {
 private entries = new Map<string,{promise:Promise<T>;at:number;controller:AbortController;done:boolean}>();
 constructor(private load:(id:string,signal:AbortSignal)=>Promise<T>,private now=()=>Date.now()) {}
 cancelExcept(id: string | null): void {
  for(const [key,entry] of this.entries)if(key!==id&&!entry.done){entry.controller.abort();this.entries.delete(key);}
 }
 get(id:string):Promise<T> {
  const existing=this.entries.get(id);
  if(existing && this.now()-existing.at<60_000) return existing.promise;
  this.entries.delete(id);const controller=new AbortController();
  const entry: {promise:Promise<T>;at:number;controller:AbortController;done:boolean}={promise:Promise.resolve(null as T),at:this.now(),controller,done:false};
  entry.promise=this.load(id,controller.signal).finally(()=>{entry.done=true;});this.entries.set(id,entry);
  while(this.entries.size>100){const key=this.entries.keys().next().value!;this.entries.get(key)!.controller.abort();this.entries.delete(key);}
  return entry.promise;
 }
}
