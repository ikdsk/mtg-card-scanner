export type Candidate = { cardId: string | null; score: number | null; cornersValid: boolean; cardPresent: boolean; margin?: number };
export class StabilityGate {
  private last: string | null = null;
  private count = 0;
  constructor(private config = {score:.75,margin:.025,consecutive:2}) {}
  configure(config: typeof this.config): void { this.config=config; this.reset(); }
  observe(candidate: Candidate): string | null {
    if (!candidate.cardPresent || !candidate.cornersValid || !candidate.cardId || candidate.score === null || !Number.isFinite(candidate.score) || candidate.score < this.config.score || !Number.isFinite(candidate.margin ?? 0) || (candidate.margin ?? 0) < this.config.margin) { this.reset(); return null; }
    this.count = this.last === candidate.cardId ? this.count + 1 : 1;
    this.last = candidate.cardId;
    return this.count >= this.config.consecutive ? candidate.cardId : null;
  }
  reset(): void { this.last = null; this.count = 0; }
}
