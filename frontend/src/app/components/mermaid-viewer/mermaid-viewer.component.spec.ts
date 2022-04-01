import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AppTestingModule } from '../../app-testing.module';
import { ChartErrorKey, ChartError } from '../../models/error.model';
import { DataStudioService } from '../../services/data-studio.service';
import { StateInjector } from '../../services/state.token';
import { State } from '../../state/state';

import { MermaidViewerComponent } from './mermaid-viewer.component';

describe('MermaidViewerComponent', () => {
  let component: MermaidViewerComponent;
  let fixture: ComponentFixture<MermaidViewerComponent>;
  let dataStudioService: DataStudioService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MermaidViewerComponent],
      providers: [{ provide: StateInjector(ChartErrorKey), useValue: new State<ChartError>() }],
      imports: [AppTestingModule],
    })
      .compileComponents();
  });

  beforeEach(() => {
    dataStudioService = TestBed.inject(DataStudioService);
    spyOn(dataStudioService, 'saveCommand');
    fixture = TestBed.createComponent(MermaidViewerComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('refreshZoom2', () => {
    beforeEach(() => {
      component.loaded = true;
      component.scale = 0.8;
    });

    it('should zoom out', () => {
      // Arrange
      const initalScale = component.scale;
      const wheelEvent = new WheelEvent('WheelEvent', {
        deltaY: 10
      });
      // Act
      component.refreshZoom2(wheelEvent);
      // Assert
      expect(component.scale).toBe(initalScale - 0.1);
    });

    it('should zoom in', () => {
      // Arrange
      const initalScale = component.scale;
      const wheelEvent = new WheelEvent('WheelEvent', {
        deltaY: -10
      });
      // Act
      component.refreshZoom2(wheelEvent);
      // Assert
      expect(component.scale).toBe(initalScale + 0.1);
    });

    it('should not go out of lower bound', () => {
      // Arrange
      const wheelEvent = new WheelEvent('WheelEvent', {
        deltaY: 1000
      });
      // Act
      component.refreshZoom2(wheelEvent);
      // Assert
      expect(component.scale).toBe(0.1);
    });

    it('should not go out of upper bound', () => {
      // Arrange
      const wheelEvent = new WheelEvent('WheelEvent', {
        deltaY: -1000
      });
      // Act
      component.refreshZoom2(wheelEvent);
      // Assert
      expect(component.scale).toBe(4);
    });
  });

  describe('exportSvg', () => {

    it('should call export', () => {
      // Act
      component.exportSvg('svg', 'mermaid');
      // Assert
      expect(dataStudioService.saveCommand).toHaveBeenCalledOnceWith({ chart: 'svg', mermaid: 'mermaid' });
    });
  });

  describe('ViewBoxString', () => {
    beforeEach(() => {
      spyOnProperty(dataStudioService, 'Database$').and.returnValue(of({ svg: sampleSvg }));
      fixture = TestBed.createComponent(MermaidViewerComponent);
      component = fixture.componentInstance;
    });

    it('should be rendered based on scale and dimensions', fakeAsync(() => {
      // Act
      of().subscribe(() => {
        expect(component.ViewBoxString).toBe('0 0 1000 1000');
      });
      tick(100);
    }));

  });

});

const sampleSvg = `
<svg id="mermaidSvgChart" width="100%" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" height="304" style="max-width: 115.78334045410156px;" viewBox="0 0 115.78334045410156 304"><style>#graph-div {font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;fill:#ccc;}#graph-div .error-icon{fill:#a44141;}#graph-div .error-text{fill:#ddd;stroke:#ddd;}#graph-div .edge-thickness-normal{stroke-width:2px;}#graph-div .edge-thickness-thick{stroke-width:3.5px;}#graph-div .edge-pattern-solid{stroke-dasharray:0;}#graph-div .edge-pattern-dashed{stroke-dasharray:3;}#graph-div .edge-pattern-dotted{stroke-dasharray:2;}#graph-div .marker{fill:lightgrey;stroke:lightgrey;}#graph-div .marker.cross{stroke:lightgrey;}#graph-div svg{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;}#graph-div g.classGroup text{fill:#81B1DB;fill:#e0dfdf;stroke:none;font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:10px;}#graph-div g.classGroup text .title{font-weight:bolder;}#graph-div .nodeLabel,#graph-div .edgeLabel{color:#e0dfdf;}#graph-div .edgeLabel .label rect{fill:#1f2020;}#graph-div .label text{fill:#e0dfdf;}#graph-div .edgeLabel .label span{background:#1f2020;}#graph-div .classTitle{font-weight:bolder;}#graph-div .node rect,#graph-div .node circle,#graph-div .node ellipse,#graph-div .node polygon,#graph-div .node path{fill:#1f2020;stroke:#81B1DB;stroke-width:1px;}#graph-div .divider{stroke:#81B1DB;stroke:1;}#graph-div g.clickable{cursor:pointer;}#graph-div g.classGroup rect{fill:#1f2020;stroke:#81B1DB;}#graph-div g.classGroup line{stroke:#81B1DB;stroke-width:1;}#graph-div .classLabel .box{stroke:none;stroke-width:0;fill:#1f2020;opacity:0.5;}#graph-div .classLabel .label{fill:#81B1DB;font-size:10px;}#graph-div .relation{stroke:lightgrey;stroke-width:1;fill:none;}#graph-div .dashed-line{stroke-dasharray:3;}#graph-div #compositionStart,#graph-div .composition{fill:lightgrey!important;stroke:lightgrey!important;stroke-width:1;}#graph-div #compositionEnd,#graph-div .composition{fill:lightgrey!important;stroke:lightgrey!important;stroke-width:1;}#graph-div #dependencyStart,#graph-div .dependency{fill:lightgrey!important;stroke:lightgrey!important;stroke-width:1;}#graph-div #dependencyStart,#graph-div .dependency{fill:lightgrey!important;stroke:lightgrey!important;stroke-width:1;}#graph-div #extensionStart,#graph-div .extension{fill:lightgrey!important;stroke:lightgrey!important;stroke-width:1;}#graph-div #extensionEnd,#graph-div .extension{fill:lightgrey!important;stroke:lightgrey!important;stroke-width:1;}#graph-div #aggregationStart,#graph-div .aggregation{fill:#1f2020!important;stroke:lightgrey!important;stroke-width:1;}#graph-div #aggregationEnd,#graph-div .aggregation{fill:#1f2020!important;stroke:lightgrey!important;stroke-width:1;}#graph-div .edgeTerminals{font-size:11px;}#graph-div :root{--mermaid-font-family:"trebuchet ms",verdana,arial,sans-serif;}</style><g transform="translate(0, 0)"><defs><marker id="classDiagram-aggregationStart" class="marker aggregation classDiagram" refX="0" refY="7" markerWidth="190" markerHeight="240" orient="auto"><path d="M 18,7 L9,13 L1,7 L9,1 Z"></path></marker></defs><defs><marker id="classDiagram-aggregationEnd" class="marker aggregation classDiagram" refX="19" refY="7" markerWidth="20" markerHeight="28" orient="auto"><path d="M 18,7 L9,13 L1,7 L9,1 Z"></path></marker></defs><defs><marker id="classDiagram-extensionStart" class="marker extension classDiagram" refX="0" refY="7" markerWidth="190" markerHeight="240" orient="auto"><path d="M 1,7 L18,13 V 1 Z"></path></marker></defs><defs><marker id="classDiagram-extensionEnd" class="marker extension classDiagram" refX="19" refY="7" markerWidth="20" markerHeight="28" orient="auto"><path d="M 1,1 V 13 L18,7 Z"></path></marker></defs><defs><marker id="classDiagram-compositionStart" class="marker composition classDiagram" refX="0" refY="7" markerWidth="190" markerHeight="240" orient="auto"><path d="M 18,7 L9,13 L1,7 L9,1 Z"></path></marker></defs><defs><marker id="classDiagram-compositionEnd" class="marker composition classDiagram" refX="19" refY="7" markerWidth="20" markerHeight="28" orient="auto"><path d="M 18,7 L9,13 L1,7 L9,1 Z"></path></marker></defs><defs><marker id="classDiagram-dependencyStart" class="marker dependency classDiagram" refX="0" refY="7" markerWidth="190" markerHeight="240" orient="auto"><path d="M 5,7 L9,13 L1,7 L9,1 Z"></path></marker></defs><defs><marker id="classDiagram-dependencyEnd" class="marker dependency classDiagram" refX="19" refY="7" markerWidth="20" markerHeight="28" orient="auto"><path d="M 18,7 L9,13 L14,7 L9,1 Z"></path></marker></defs><g class="root"><g class="clusters"></g><g class="edgePaths"><path d="M57.89167022705078,99L57.89167022705078,103.16666666666667C57.89167022705078,107.33333333333333,57.89167022705078,115.66666666666667,57.89167022705078,124C57.89167022705078,132.33333333333334,57.89167022705078,140.66666666666666,57.89167022705078,144.83333333333334L57.89167022705078,149" id="id1" class="  edge-pattern-solid relation" style="fill:none" marker-start="url(#classDiagram-extensionStart)"></path></g><g class="edgeLabels"><g class="edgeLabel"><g class="label" transform="translate(0, 0)"><foreignObject width="0" height="0"><div style="display: inline-block; white-space: nowrap;" xmlns="http://www.w3.org/1999/xhtml"><span class="edgeLabel"></span></div></foreignObject></g></g></g><g class="nodes"><g class="node default" id="classid-Person-465" transform="translate(57.89167022705078, 53.5)"><rect class="outer title-state" x="-32.525001525878906" y="-45.5" width="65.05000305175781" height="91"></rect><line class="divider" x1="-32.525001525878906" x2="32.525001525878906" y1="-9.5" y2="-9.5"></line><line class="divider" x1="-32.525001525878906" x2="32.525001525878906" y1="34.5" y2="34.5"></line><g class="label"><foreignObject width="0" height="0"><div style="display: inline-block; white-space: nowrap;" xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel"></span></div></foreignObject><foreignObject class="classTitle" width="50.05000305175781" height="24" transform="translate( -25.025001525878906, -38)"><div style="display: inline-block; white-space: nowrap;" xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel">Person</span></div></foreignObject><foreignObject width="37.850006103515625" height="24" transform="translate( -25.025001525878906, 2)"><div style="display: inline-block; white-space: nowrap;" xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel">int Id</span></div></foreignObject></g></g><g class="node default" id="classid-Contact-466" transform="translate(57.89167022705078, 222.5)"><rect class="outer title-state" x="-49.89167022705078" y="-73.5" width="99.78334045410156" height="147"></rect><line class="divider" x1="-49.89167022705078" x2="49.89167022705078" y1="-37.5" y2="-37.5"></line><line class="divider" x1="-49.89167022705078" x2="49.89167022705078" y1="62.5" y2="62.5"></line><g class="label"><foreignObject width="0" height="0"><div style="display: inline-block; white-space: nowrap;" xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel"></span></div></foreignObject><foreignObject class="classTitle" width="57.68333435058594" height="24" transform="translate( -28.84166717529297, -66)"><div style="display: inline-block; white-space: nowrap;" xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel">Contact</span></div></foreignObject><foreignObject width="37.850006103515625" height="24" transform="translate( -42.39167022705078, -26)"><div style="display: inline-block; white-space: nowrap;" xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel">int Id</span></div></foreignObject><foreignObject width="84.75" height="24" transform="translate( -42.39167022705078, 2)"><div style="display: inline-block; white-space: nowrap;" xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel">string Email</span></div></foreignObject><foreignObject width="84.78334045410156" height="24" transform="translate( -42.39167022705078, 30)"><div style="display: inline-block; white-space: nowrap;" xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel">int PersonId</span></div></foreignObject></g></g></g></g></g></svg>
`;
