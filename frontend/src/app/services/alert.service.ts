import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ChartError } from '../models/error.model';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  public get Alert$(): Observable<ChartError | undefined> {
    return this.alert$.asObservable();
  }

  private alert$: BehaviorSubject<ChartError> = new BehaviorSubject(undefined as any as ChartError);

  public showError(error: ChartError): void {
    this.alert$.next(error);
  }

  public dismissError(): void {
    this.alert$.next(undefined as any as ChartError);
  }
}
