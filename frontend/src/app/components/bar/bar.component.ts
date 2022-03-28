import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
})
export class BarComponent {

  constructor(private readonly router: Router) { }

  public navigate(route: string): void {
    this.router.navigate([route]);
  }

}
