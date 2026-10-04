export class ProviderError extends Error {
  constructor(message: string, readonly status = 0) { super(message); }
}
type Entry = { at: number; value: unknown };
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const timer = setTimeout(() => { cleanup(); resolve(); }, ms);
    const abort = () => { clearTimeout(timer); cleanup(); reject(signal?.reason); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
}
function abortable<T>(job: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return job;
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    void job.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
class Schedule {
  private queue: Promise<unknown> = Promise.resolve();
  private lastStart = 0;
  private cooldownUntil = 0;
  reserve(gap: number, signal?: AbortSignal): Promise<void> {
    const job = this.queue.catch(() => undefined).then(async () => {
      signal?.throwIfAborted();
      let delay: number;
      while ((delay = Math.max(this.lastStart + gap, this.cooldownUntil) - Date.now()) > 0) await wait(delay, signal);
      signal?.throwIfAborted();
      this.lastStart = Date.now();
    });
    this.queue = job;
    return abortable(job, signal);
  }
  limited(response: Response): void {
    const value = response.headers.get('Retry-After');
    const seconds = value !== null && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : null;
    const requested = seconds !== null ? Date.now() + seconds * 1000 : value ? Date.parse(value) : 0;
    this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + 30100, Number.isFinite(requested) ? requested : 0);
  }
}
// Clients sharing the same transport share provider limits, including native fetch.
// A separately injected mock transport has isolated scheduling state.
const schedules = new WeakMap<typeof fetch, Map<string, Schedule>>();
function scheduleFor(fetcher: typeof fetch, origin: string): Schedule {
  let origins = schedules.get(fetcher);
  if (!origins) { origins = new Map(); schedules.set(fetcher, origins); }
  let schedule = origins.get(origin);
  if (!schedule) { schedule = new Schedule(); origins.set(origin, schedule); }
  return schedule;
}
export class JsonClient {
  private queue: Promise<unknown> = Promise.resolve();
  private cache = new Map<string, Entry>();
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly gap = 110, private readonly ttl = 86_400_000, private readonly timeout = 12_000) {}
  async get<T = unknown>(url: string, signal?: AbortSignal, validate: (value: unknown) => T = value => value as T): Promise<T> {
    const entry = this.cache.get(url);
    if (entry && Date.now() - entry.at < this.ttl) { signal?.throwIfAborted(); try { return validate(structuredClone(entry.value)); } catch (error) { this.cache.delete(url); throw error; } }
    const job = this.queue.catch(() => undefined).then(async () => {
      signal?.throwIfAborted();
      const endpoint = new URL(url);
      const schedule = scheduleFor(this.fetcher, endpoint.origin);
      const scryfall = endpoint.origin === 'https://api.scryfall.com';
      const slow = ['/cards/search', '/cards/named', '/cards/random', '/cards/collection'].includes(endpoint.pathname);
      const gap = scryfall ? Math.max(slow ? 510 : 110, this.gap) : this.gap;
      await schedule.reserve(gap, signal);
      signal?.throwIfAborted();
      const bounded = signal ? AbortSignal.any([signal, AbortSignal.timeout(this.timeout)]) : AbortSignal.timeout(this.timeout);
      const fetcher = this.fetcher;
      const response = await fetcher(url, { signal: bounded, headers: { Accept: 'application/json' } });
      if (response.status === 429) schedule.limited(response);
      if (!response.ok) throw new ProviderError(response.status === 429 ? 'アクセス制限中です。時間をおいて再試行してください。' : `情報を取得できません（HTTP ${response.status}）`, response.status);
      const value: unknown = await response.json();
      const validated = validate(structuredClone(value));
      this.cache.set(url, { at: Date.now(), value });
      if (this.cache.size > 200) this.cache.delete(this.cache.keys().next().value!);
      return validated;
    });
    this.queue = job;
    return abortable(job, signal);
  }
}
