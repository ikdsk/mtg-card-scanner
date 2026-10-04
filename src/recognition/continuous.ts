import { defaults, type RecognitionSettings } from './settings.js';
import { StabilityGate, type Candidate } from './gate.js';
/** Camera-only event guard. Identity groups printing jitter by worker Oracle ID. */
export class ContinuousScan {
 private settings: RecognitionSettings = {...defaults};
 configure(settings: RecognitionSettings): void { this.settings={...settings}; this.gate.configure({score:settings.autoScore,margin:settings.autoMargin,consecutive:settings.autoConsecutive}); this.absentSince=null;this.absentCount=0; }
 accept(identity: string): void { this.accepted=identity;this.gate.reset(); }
 private gate = new StabilityGate();
 private accepted: string | null = null;
 private absentSince: number | null = null;
 private absentCount = 0;
 observe(candidate: Candidate & { oracleId?: string | undefined }, now: number): string | null {
  if (candidate.cardPresent === false) {
   this.absentSince ??= now; this.absentCount++;
   if (this.absentCount >= this.settings.rearmCount && now - this.absentSince >= this.settings.rearmMs) this.accepted = null;
  } else { this.absentSince = null; this.absentCount = 0; }
  const identity = typeof candidate.oracleId === 'string' && candidate.oracleId ? candidate.oracleId : candidate.cardId;
  const stable = this.gate.observe(candidate);
  if (!stable || identity === this.accepted) return null;
  this.accepted = identity;
  return candidate.cardId;
 }
 reset(): void { this.gate.reset(); this.accepted = null; this.absentSince = null; this.absentCount = 0; }
}
