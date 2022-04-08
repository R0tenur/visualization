import { Component, HostListener, Inject, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Exportable } from '../../models/exportable.model';
import { DataStudioService } from '../../services/data-studio.service';
import { WINDOW } from '../../services/window.token';
@Component({
  selector: 'app-mermaid-viewer',
  templateUrl: './mermaid-viewer.component.html',
  styleUrls: ['./mermaid-viewer.component.scss']
})
export class MermaidViewerComponent implements OnDestroy {
  private readonly mermaidSvgId: string = 'mermaidSvgChart';
  public get ViewBoxString(): string {
    return `${this.viewBox.value.x / this.scale} ${this.viewBox.value.y / this.scale} ${this.viewBox.value.w / this.scale} ${this.viewBox.value.h / this.scale}`;
  }
  public get Database$(): Observable<Exportable> {
    return this.dataStudioService.Database$;
  }

  public safeSvg!: SafeHtml;
  private svgElement!: SVGElement;
  private isPanning = false;
  private viewBox: BehaviorSubject<any> = new BehaviorSubject(null);
  public svgSize: any = { w: 0, h: 0 };
  public scale = 0.8;
  public loaded = false;
  private startPoint: { x: number, y: number } = { x: 0, y: 0 };
  private endPoint: { x: number, y: number } = { x: 0, y: 0 };
  public database: Exportable | undefined;
  private viewBoxSubscription!: Subscription;


  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly dataStudioService: DataStudioService,
    @Inject(WINDOW) private readonly window: Window) {
    this.dataStudioService
      .Database$.pipe(take(1)).subscribe(d => {
        if (!this.database) {
          this.database = d;
          this.safeSvg = this.safeHtml(d.svg);

        }
      });
  }

  public ngOnDestroy(): void {
    if (this.viewBoxSubscription) {
      this.viewBoxSubscription.unsubscribe();
    }
  }
  public resetZoom(): void {
    this.scale = .8;
    this.viewBox.next({ x: 0, y: 0, ...this.svgSize });
  }

  public refreshZoom(): void {
    this.viewBox.next(this.viewBox.value);
  }
  public exportSvg(svg: string, markdown: string): void {
    this.dataStudioService.saveCommand({ chart: svg, mermaid: markdown });
  }

  @HostListener('body:wheel', ['$event'])
  public refreshZoom2(e: WheelEvent): void {

    if (!this.loaded) {
      return;
    }
    this.scale += (-e.deltaY / 100);

    if (this.scale < 0.1) {
      this.scale = 0.1;
    }

    if (this.scale > 4) {
      this.scale = 4;
    }
    this.viewBox.next(this.viewBox.value);
  }

  @HostListener('body:mousedown', ['$event'])
  private startPan(e: MouseEvent): boolean {

    if (this.loaded && !(e.target as any).classList.contains('zoom')) {
      this.isPanning = true;
      this.startPoint = { x: e.x, y: e.y };
    }
    return true;
  }
  @HostListener('body:mousemove', ['$event'])
  private panning(e: MouseEvent): boolean {
    if (this.isPanning && this.loaded) {
      this.endPoint = { x: e.x, y: e.y };
      let dx = (this.startPoint.x - this.endPoint.x - 5) / (10);
      let dy = (this.startPoint.y - this.endPoint.y - 5) / (10);


      if (this.viewBox.value.x + dx < -(this.svgSize.w * this.scale - 10) ||
        this.viewBox.value.x + dx > Math.abs((this.svgSize.w * this.scale)) - 10) {
        dx = 0;
      }

      if (this.viewBox.value.y + dy < -(this.svgSize.h * this.scale - 10) ||
        this.viewBox.value.y + dy > Math.abs((this.svgSize.h * this.scale)) - 10) {
        dy = 0;
      }
      this.viewBox.next({ x: this.viewBox.value.x + dx, y: this.viewBox.value.y + dy, w: this.viewBox.value.w, h: this.viewBox.value.h });

    }
    return true;
  }
  @HostListener('body:mouseup', ['$event'])
  private panEnd(): boolean {
    if (this.isPanning && this.loaded) {

      this.isPanning = false;
    }
    return true;
  }

  private setupSvgHandling(): void {
    setTimeout(() => {
      this.svgElement = this.window.document.querySelector('#' + this.mermaidSvgId) as SVGElement;
      this.removeMermaidAttributes();
      this.svgSize = { w: this.svgElement.clientWidth, h: this.svgElement.clientHeight };
      this.viewBox.next({ x: 0, y: 0, ...this.svgSize });
      this.startPoint = { x: 0, y: 0 };
      this.endPoint = { x: 0, y: 0 };
      this.loaded = true;
    }, 40);

    setTimeout(() => {
      this.viewBoxSubscription = this.viewBox.asObservable().subscribe(() => {
        this.window.document.getElementById(this.mermaidSvgId)?.setAttribute('viewBox', this.ViewBoxString);
      });

    }, 200);
  }
  private safeHtml(svg: string): SafeHtml {
    this.setupSvgHandling();
    return this.sanitizer.bypassSecurityTrustHtml(svg); // NOSONAR - html is produces by mermaid
  }

  private removeMermaidAttributes(): void {
    this.window.document.getElementById(this.mermaidSvgId)?.removeAttribute('style');
    this.window.document.getElementById(this.mermaidSvgId)?.removeAttribute('height');
    this.window.document.getElementById(this.mermaidSvgId)?.removeAttribute('width');
    this.window.document.getElementById(this.mermaidSvgId)?.removeAttribute('viewBox');
  }
}
