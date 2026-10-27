/**
 * Fence asynchronous replies across guest/example/account transitions.
 * An identity can leave and return while an earlier request is outstanding;
 * comparing only the user ID cannot distinguish those two sessions.
 */
export class WorkspaceScope {
  private key = '';
  private generation = 0;

  select(key: string) {
    if (this.key !== key) {
      this.key = key;
      this.generation += 1;
    }
  }

  capture() { return this.generation; }
  accepts(generation: number) { return this.generation === generation; }
}
