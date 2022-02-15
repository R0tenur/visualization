import { Injectable } from '@angular/core';
import { concat, fromEvent, Observable, Subject } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { Status } from '../../../shared/models/status.enum';
import mermaid from 'mermaid';
import { AlertService } from './alert.service';
import { Exportable } from '../app/models/exportable.model';
declare const acquireVsCodeApi: () => ({
  postMessage: (message: any) => void;
});

interface AzData {
  chart: string;
  status: Status;
  databaseName: string;
  errors: string[];
  rawData: string;
}
interface Event {
  data: AzData;
}
@Injectable({
  providedIn: 'root'
})
export class DataStudioService {
  public get Database$(): Observable<Exportable> {
    return this.database$;
  }
  public get DatabaseName$(): Observable<string> {
    return this.databaseName$;
  }
  public get Status$(): Observable<string> {
    return this.status$;
  }
  public get MermaidSvgId(): string { return 'mermaidSvgChart'; }

  private readonly database$: Observable<Exportable>;
  private readonly databaseName$: Observable<string>;
  private readonly status$: Observable<Status>;
  private readonly vscode = this.isInDataStudio() ? acquireVsCodeApi() : {
    postMessage: (message: any) => console.log('posted', message),
  };
  private readonly clientStatus$ = new Subject<string>();
  constructor(private readonly alert: AlertService) {

    this.initializeMermaid();
    const azEvent$ = fromEvent<Event>(window, 'message').pipe(
      tap(event => {
        if (event.data.status === Status.Error) {
          this.alert.showError({
            status: event.data.status,
            errors: event.data.errors,
            rawData: JSON.stringify(event.data.rawData)
          });
        }
      })
    );

    this.status$ = concat(azEvent$.pipe(
      map(e => e.data?.status),

    ));
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
      maxTextSize: 1000000,
      theme: this.isDarkMode() ? 'dark' : 'neutral'
    } as any);
  }

  private buildSvg(markdown: string): Observable<Exportable> {
    return new Observable<Exportable>(observer => {
      try {
        mermaid.render(
          this.MermaidSvgId,
          markdown,
          (s) => {
            observer.next({ svg: s, mermaid: markdown });
            this.clientStatus$.next(Status.Complete);
          }
        );
        this.clientStatus$.next(Status.GeneratingSvg);
      } catch (error) {
        this.clientStatus$.next(Status.Error);
        this.alert.showError({
          status: Status.Complete,
          errors: [
            'Mermaid failed to parse data',
          ],
          rawData: JSON.stringify({ error, markdown })
        });
      }
    });
  }
}
