import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as d3 from 'd3';
@Component({
  selector: 'app-mermaid-viewer',
  templateUrl: './mermaid-viewer.component.html',
  styleUrls: ['./mermaid-viewer.component.scss'],
})
export class MermaidViewerComponent implements OnInit, AfterViewInit {
  @Input() public svg!: string;
  public safeSvg!: SafeHtml;

  constructor(public readonly sanitizer: DomSanitizer) {}
  ngOnInit(): void {
    this.safeSvg = this.sanitizer.bypassSecurityTrustHtml(this.svg); // NOSONAR HTML is sanitized by Mermaid
  }
  public ngAfterViewInit(): void {
    const svgs = d3.selectAll('.svg-container svg');
    svgs.each(function () {
      const svg = d3.select(this);
      svg.html('<g>' + svg.html() + '</g>');
      const inner = svg.select('g');
      const zoom = d3.zoom().on('zoom', function (event) {
        inner.attr('transform', event.transform);
      });
      svg.call(
        zoom as unknown as (
          selection: d3.Selection<d3.BaseType, unknown, null, undefined>
        ) => void
      );
    });
  }
}
