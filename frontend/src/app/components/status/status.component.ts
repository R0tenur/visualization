import { Component, OnInit } from '@angular/core';
import { Status } from '../../../../../shared/models/status.enum';
import { DataStudioService } from '../../../services/data-studio.service';

@Component({
  selector: 'app-status',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss']
})
export class StatusComponent implements OnInit {
  Status = Status;

  constructor(public readonly dataStudio: DataStudioService) { }

  ngOnInit(): void {
  }

}
