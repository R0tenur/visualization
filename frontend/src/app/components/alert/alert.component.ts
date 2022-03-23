import { Component, Inject } from '@angular/core';
import { ChartError, ChartErrorKey } from '../../models/error.model';
import { DataStudioService } from '../../services/data-studio.service';
import { StateInjector } from '../../services/state.token';
import { State} from '../../state/state';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent {
  constructor(
    @Inject(StateInjector(ChartErrorKey)) public readonly state: State<ChartError>,
    public readonly az: DataStudioService) { }

  public exportMarkdown(markdown: string): void {
    this.az.saveCommand({ mermaid: markdown });
  }
  public errorIsTextSizeExceeded(alert: ChartError): boolean {
    const errorMessage = 'Maximum text size in diagram exceeded';
    return alert.errors.includes(errorMessage);
  }
}
