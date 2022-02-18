import { AfterViewInit, Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
@Component({
  selector: 'app-mermaid-viewer',
  templateUrl: './mermaid-viewer.component.html',
  styleUrls: ['./mermaid-viewer.component.scss']
})
export class MermaidViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly mermaidSvgId: string = 'mermaidSvgChart';
  @Input() public darkmode!: boolean;
  @Input() public svg!: string;
  @Input() public safeSvg!: SafeHtml;
  @ViewChild('svgContainer')
  svgContainer!: ElementRef;
  public get ViewBoxString(): string {
    return `${this.viewBox.value.x / this.scale} ${this.viewBox.value.y / this.scale} ${this.viewBox.value.w / this.scale} ${this.viewBox.value.h / this.scale}`;
  }

  private viewBoxSubscription!: Subscription;
  private svgElement!: SVGElement;
  private isPanning = false;
  private viewBox: BehaviorSubject<any> = new BehaviorSubject(null);
  public svgSize: any = { w: 0, h: 0 };
  public scale = 0.8;
  private startPoint: { x: number, y: number } = { x: 0, y: 0 };
  private endPoint: { x: number, y: number } = { x: 0, y: 0 };
  public get Svg$(): Observable<(SafeHtml | null)> {
    return this.svg$.asObservable();
  }
  public svg$: BehaviorSubject<SafeHtml | null> = new BehaviorSubject<SafeHtml | null>(null);
  constructor(public readonly sanitizer: DomSanitizer) { }
  ngOnInit(): void {
    this.safeSvg = this.sanitizer.bypassSecurityTrustHtml(this.svg);
  }
  public ngAfterViewInit(): void {
    this.setupSvgHandling();
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

  @HostListener('body:wheel', ['$event'])
  public refreshZoom2(e: WheelEvent): void {

    this.scale += (-e.deltaY / 100);

    if (this.scale < 0.1) {
      this.scale = 0.1;
    }

    if (this.scale > 4) {
      this.scale = 4;
    }
    this.viewBox.next(this.viewBox.value);
  }

  private setupSvgHandling(): void {
    this.svgElement = document.querySelector('#' + this.mermaidSvgId) as any as SVGElement;
    this.svgSize = { w: this.svgElement.clientWidth, h: this.svgElement.clientHeight };
    this.viewBox.next({ x: 0, y: 0, ...this.svgSize });
    this.startPoint = { x: 0, y: 0 };
    this.endPoint = { x: 0, y: 0 };
    document.getElementById(this.mermaidSvgId)?.removeAttribute('style');
    document.getElementById(this.mermaidSvgId)?.removeAttribute('height');
    document.getElementById(this.mermaidSvgId)?.removeAttribute('width');
    setTimeout(() => {
      this.viewBoxSubscription = this.viewBox.asObservable().subscribe(() => {
        document.getElementById(this.mermaidSvgId)?.setAttribute('viewBox', this.ViewBoxString);
      });
    }, 60);
  }
  @HostListener('body:mousedown', ['$event'])
  private startPan(e: MouseEvent): boolean {
    if (!(e.target as any).classList.contains('zoom')) {
      this.isPanning = true;
      this.startPoint = { x: e.x, y: e.y };
    }
    return true;
  }
  @HostListener('body:mousemove', ['$event'])
  private panning(e: MouseEvent): boolean {
    if (this.isPanning) {
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
    if (this.isPanning) {
      this.isPanning = false;
    }
    return true;
  }
}
