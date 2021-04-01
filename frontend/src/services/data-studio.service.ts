import { Injectable } from '@angular/core';
import { fromEvent, Observable } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { Status } from '../../../shared/models/status.enum';
import mermaid from 'mermaid';
import { AlertService } from './alert.service';
declare const acquireVsCodeApi: () => ({
  postMessage: (message: any) => void;
});

interface AzData {
  chart: string;
  status: Status;
  databaseName: string;
  errors: string[];
}
interface Event {
  data: AzData;
}
@Injectable({
  providedIn: 'root'
})
export class DataStudioService {
  public get Database$(): Observable<string> {
    return this.database$;
  }
  public get DatabaseName$(): Observable<string> {
    return this.databaseName$;
  }
  public get Status$(): Observable<string> {
    return this.status$;
  }
  public get MermaidSvgId(): string { return 'mermaidSvgChart'; }

  private readonly database$: Observable<string>;
  private readonly databaseName$: Observable<string>;
  private readonly status$: Observable<Status>;
  private readonly vscode = this.isInDataStudio() ? acquireVsCodeApi() : {
    postMessage: (message: any) => console.log('posted', message),
  };
  constructor(private readonly alert: AlertService) {

    this.initializeMermaid();
    const azEvent$ = fromEvent<Event>(window, 'message').pipe(
      tap(event => {
        if (event.data.status === Status.Error) {
          this.alert.showError({
            status: event.data.status,
            errors: event.data.errors,
            rawData: JSON.stringify(event.data.errors)
          });
        }
      })
    );

    this.status$ = azEvent$.pipe(
      map(e => e.data?.status)
    );
    this.database$ = azEvent$.pipe(
      filter(event => event.data?.status === Status.Complete),
      map(event => event.data?.chart),
      switchMap(r => this.buildSvg(r))
    );

    this.databaseName$ = azEvent$.pipe(
      filter(event => event.data?.status === Status.Complete),
      map(event => event.data?.databaseName));
  }

  public isInDataStudio(): boolean {
    return document.getElementsByTagName('body')[0].hasAttribute('data-vscode-theme-name');
  }
  public isDarkMode(): boolean {
    return document.getElementsByTagName('body')[0].getAttribute('data-vscode-theme-kind') === 'vscode-dark';
  }

  public sendMessage(message: any): void {
    this.vscode.postMessage({
      ...{
        command: 'save',
        data: message
      }
    });
  }

  private initializeMermaid(): void {
    mermaid.initialize({
      startOnLoad: false,
      theme: this.isDarkMode() ? 'dark' : 'neutral'
    });
  }

  private buildSvg(markdown: string): Observable<string> {
    return new Observable<string>(observer => {
      try {
        mermaid.render(
          this.MermaidSvgId,
          markdown,
          (svg) => observer.next(svg)
        );
      } catch (error) {
        this.alert.showError({
          status: Status.Complete,
          errors: [
            'Mermaid failed to parse data',
          ],
          rawData: JSON.stringify(error)
        });
      }
    });
  }
}
