export type Candidate = { cardId: string | null; score: number | null; cornersValid: boolean; cardPresent: boolean; margin?: number };
export class StabilityGate {
  private last: string | null = null;
  private count = 0;
  observe(candidate: Candidate): string | null {
    if (!candidate.cardPresent || !candidate.cornersValid || !candidate.cardId || candidate.score === null || !Number.isFinite(candidate.score) || candidate.score < 0.75 || (candidate.margin ?? 0) < 0.025) { this.reset(); return null; }
    this.count = this.last === candidate.cardId ? this.count + 1 : 1;
    this.last = candidate.cardId;
    return this.count >= 2 ? candidate.cardId : null;
  }
  reset(): void { this.last = null; this.count = 0; }
}
