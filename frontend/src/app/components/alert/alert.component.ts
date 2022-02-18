import { Component } from '@angular/core';
import { ChartError } from '../../models/error.model';
import { AlertService } from '../../services/alert.service';
import { DataStudioService } from '../../services/data-studio.service';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent {
  constructor(public readonly alertService: AlertService, public readonly az: DataStudioService) {}
  public exportMarkdown(markdown: string): void {
    this.az.saveCommand({ mermaid: markdown });
  }
  public errorIsTextSizeExceeded(alert: ChartError): boolean {
    const errorMessage = 'Maximum text size in diagram exceeded';
    return alert.errors.includes(errorMessage);
  }
}
