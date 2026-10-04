import type { Candidate } from './gate.js';
export type Suggestion = { readonly cardId: string; readonly identity: string; readonly version: number; readonly faceIndex: number; readonly score: number };
export class LiveCandidate {
 private pending: Suggestion | null = null;
 private suppressed = new Set<string>();
 private dismissed: string | null = null;
 private version = 0;
 private absentSince: number | null = null;
 private absentCount = 0;
 constructor(private threshold = .5, private rearmCount = 3, private rearmMs = 600) {}
 observe(c: Candidate & {oracleId?: string | undefined}, now: number): Suggestion | null {
  if(c.cardPresent === false) {
   this.absentSince ??= now; this.absentCount++;
   if(this.absentCount >= this.rearmCount && now-this.absentSince >= this.rearmMs) {this.suppressed.clear();this.dismissed=null;}
  } else { this.absentSince=null; this.absentCount=0; }
  const identity=c.oracleId || c.cardId;
  if(c.cardPresent && c.cornersValid && c.score!==null && Number.isFinite(c.score) && c.score>=this.threshold && identity && identity!==this.dismissed) this.dismissed=null;
  if(!c.cardPresent || !c.cornersValid || !c.cardId || !identity || c.score===null || !Number.isFinite(c.score) || c.score<this.threshold || (this.suppressed.has(identity)||this.dismissed===identity)) { this.pending=null; return null; }
  const faceIndex=c.faceIndex===1?1:0;
  if(this.pending?.faceIndex===faceIndex && this.pending?.cardId===c.cardId && this.pending.identity===identity) this.pending={...this.pending,score:c.score};
  else this.pending={cardId:c.cardId,identity,faceIndex,score:c.score,version:++this.version};
  return this.pending;
 }
 current(snapshot: Suggestion): boolean { return this.pending?.version===snapshot.version && this.pending.cardId===snapshot.cardId; }
 dismiss(snapshot: Suggestion): void { this.dismissed=snapshot.identity; if(this.current(snapshot)) this.pending=null; }
 accepted(identity: string): void { this.suppressed.clear();this.suppressed.add(identity); this.pending=null; }
 newContext(): void {this.reset();this.suppressed.clear();this.dismissed=null;}
 reset(threshold=this.threshold,rearmCount=this.rearmCount,rearmMs=this.rearmMs): void { this.threshold=threshold;this.rearmCount=rearmCount;this.rearmMs=rearmMs;this.pending=null;this.version++;this.absentCount=0;this.absentSince=null; }
}
