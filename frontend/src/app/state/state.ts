import { Observable, BehaviorSubject } from 'rxjs';

export class State<T> {
  public get select$(): Observable<T> {
    return this.state.asObservable();
  }
  private currentHistoryIndex = 0;
  private history: T[] = [undefined as any as T];
  private readonly state: BehaviorSubject<T> = new BehaviorSubject<T>(undefined as any as T);

  public set(newState: T): void {
    if (this.currentHistoryIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentHistoryIndex);
    }

    this.history.push(newState);
    this.currentHistoryIndex = this.history.length - 1;
    this.state.next(newState);
  }

  public clear(): void {
    this.state.next(undefined as any as T);
  }
  public undo(): void {
    if (this.currentHistoryIndex > 0) {
      this.currentHistoryIndex--;
      this.state.next(this.history[this.currentHistoryIndex]);
    }
  }
  public redo(): void {

    if (this.currentHistoryIndex < this.history.length - 1) {
      this.currentHistoryIndex++;
      this.state.next(this.history[this.currentHistoryIndex]);
    }
  }
}
