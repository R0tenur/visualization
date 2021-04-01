import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Status } from '../../../shared/models/status.enum';
import { DataStudioService } from '../services/data-studio.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  public get Database$(): Observable<string> {
    return this.dataStudioService.Database$;
  }
  constructor(public readonly dataStudioService: DataStudioService) { }

  public async triggerFakeEvent(): Promise<void> {
    const gettingDataEvent = new CustomEvent('message') as any;
    gettingDataEvent.data = {
      status: Status.GettingTableData,
    };
    window.dispatchEvent(gettingDataEvent);
    await this.delay(500);

    const buildingEvent = new CustomEvent('message') as any;
    buildingEvent.data = {
      status: Status.BuildingChart,
    };
    window.dispatchEvent(buildingEvent);
    await this.delay(500);

    const event = new CustomEvent('message') as any;
    event.data = {
      status: Status.Complete,
      databaseName: 'Northwind',
      chart: `classDiagram

class Employees {
    Address
          BirthDate
          City
          Country
          EmployeeID
          Extension
          FirstName
          HireDate
          HomePhone
          LastName
          Notes
          Photo
          PhotoPath
          PostalCode
          Region
          ReportsTo
          Title
          TitleOfCourtesy

}

class Categories {
    CategoryID
          CategoryName
          Description
          Picture

}

class Customers {
    Address
          City
          CompanyName
          ContactName
          ContactTitle
          Country
          CustomerID
          Fax
          Phone
          PostalCode
          Region

}

class Shippers {
    CompanyName
          Phone
          ShipperID

}

class Suppliers {
    Address
          City
          CompanyName
          ContactName
          ContactTitle
          Country
          Fax
          HomePage
          Phone
          PostalCode
          Region
          SupplierID

}

class Orders {
    CustomerID
          EmployeeID
          Freight
          OrderDate
          OrderID
          RequiredDate
          ShipAddress
          ShipCity
          ShipCountry
          ShipName
          ShippedDate
          ShipPostalCode
          ShipRegion
          ShipVia

}

class Products {
    CategoryID
          Discontinued
          ProductID
          ProductName
          QuantityPerUnit
          ReorderLevel
          SupplierID
          UnitPrice
          UnitsInStock
          UnitsOnOrder

}

class Order Details {
    Discount
          OrderID
          ProductID
          Quantity
          UnitPrice

}

class CustomerCustomerDemo {
    CustomerID
          CustomerTypeID

}

class CustomerDemographics {
    CustomerDesc
          CustomerTypeID

}

class Region {
    RegionDescription
          RegionID

}

class Territories {
    RegionID
          TerritoryDescription
          TerritoryID

}

class EmployeeTerritories {
    EmployeeID
          TerritoryID

}

      Employees --|> Employees: EmployeeID
            Orders --|> Customers: CustomerID
            Orders --|> Employees: EmployeeID
            Orders --|> Shippers: ShipperID
            Products --|> Categories: CategoryID
            Products --|> Suppliers: SupplierID
            Order Details --|> Orders: OrderID
            Order Details --|> Products: ProductID
            CustomerCustomerDemo --|> Customers: CustomerID
            CustomerCustomerDemo --|> CustomerDemographics: CustomerTypeID
            Territories --|> Region: RegionID
            EmployeeTerritories --|> Employees: EmployeeID
            EmployeeTerritories --|> Territories: TerritoryID

      `
    };

    window.dispatchEvent(event);
  }
  public isNotInDataStudio(): boolean {
    return !document.getElementsByTagName('body')[0].hasAttribute('data-vscode-theme-name');
  }
  public exportSvg(svg: string): void {
    this.dataStudioService.sendMessage(svg);
  }

  private delay(milliSeconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliSeconds));
  }
}
