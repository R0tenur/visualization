// eslint-disable-next-line
import { Inject, Injectable } from '@angular/core';
import { concat, fromEvent, Observable, ReplaySubject, Subject } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { Status } from '../../../../shared/models/status.enum';
import { AlertService } from './alert.service';
import { Exportable } from '../models/exportable.model';
import { WINDOW, WindowService } from './window.token';
import { MERMAID } from './mermaid.token';
import { ViewOptions } from '@shared/models/options.model';

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
  providedIn: 'root',
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
  public get Markdown$(): Observable<string> {
    return this.markdown$.asObservable();
  }
  public get MermaidSvgId(): string {
    return 'mermaidSvgChart';
  }

  private readonly database$: Observable<Exportable>;
  private readonly databaseName$: Observable<string>;
  private readonly status$: Observable<Status>;
  private readonly markdown$ = new ReplaySubject<string>();
  private readonly db$ = new ReplaySubject<Exportable>();
  private readonly vscode = this.isInDataStudio()
    ? this.window.acquireVsCodeApi()
    : {
        postMessage: (message: any) =>
          this.window.console.log('posted', message),
      };
  private readonly clientStatus$ = new Subject<string>();
  constructor(
    @Inject(WINDOW) private readonly window: WindowService,
    @Inject(MERMAID) private readonly mermaid: any,
    private readonly alert: AlertService
  ) {
    this.initializeMermaid();
    const azEvent$ = fromEvent<Event>(this.window, 'message').pipe(
      tap((event) => {
        if (event.data.status === Status.Error) {
          this.alert.showError({
            status: event.data.status,
            errors: event.data.errors,
            rawData: JSON.stringify(event.data.rawData),
          });
        }
      })
    );

    this.status$ = concat(azEvent$.pipe(map((e) => e.data?.status)));

    this.database$ = azEvent$.pipe(
      filter((event) => event.data?.status === Status.Complete),
      map((event) => event.data?.chart),
      switchMap((r) => this.buildSvg(r)),
      switchMap((r) => {
        this.db$.next(r);
        return this.db$;
      })
    );

    this.databaseName$ = azEvent$.pipe(
      filter((event) => event.data?.status === Status.Complete),
      map((event) => event.data?.databaseName)
    );
  }

  public isInDataStudio(): boolean {
    return this.window.document
      .getElementsByTagName('body')[0]
      .hasAttribute('data-vscode-theme-name');
  }
  public isDarkMode(): boolean {
    return (
      this.window.document
        .getElementsByTagName('body')[0]
        .getAttribute('data-vscode-theme-kind') === 'vscode-dark'
    );
  }

  public saveCommand(message: any): void {
    this.vscode.postMessage({
      command: 'save',
      data: message,
    });
  }

  public loadCommand(options: ViewOptions): void {
    this.vscode.postMessage({
      command: 'load',
      options,
    });
    this.db$.next();
  }

  private initializeMermaid(): void {
    this.mermaid.initialize({
      startOnLoad: false,
      maxTextSize: 1000000,
      useMaxWidth: true,
      theme: this.isDarkMode() ? 'dark' : 'neutral',
    });
  }

  private buildSvg(markdown: string): Observable<Exportable> {
    this.markdown$.next(markdown);
    return new Observable<Exportable>((observer) => {
      try {
        this.mermaid.render(this.MermaidSvgId, markdown, (s: string) => {
          observer.next({ svg: s, mermaid: markdown });
          this.clientStatus$.next(Status.Complete);
        });
        this.clientStatus$.next(Status.GeneratingSvg);
      } catch (e: any) {
        this.clientStatus$.next(Status.Error);
        this.alert.showError({
          status: Status.Complete,
          errors: [e.message, 'Mermaid failed to parse data'],
          rawData: JSON.stringify({
            message: e.message,
            stack: e.stack,
            markdown,
          }),
        });
      }
    });
  }
}
