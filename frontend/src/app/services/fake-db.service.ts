/* istanbul ignore file */
// Ignore since only used for local testing

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FakeDbService {
  private readonly header = 'classDiagram';

  public createDiagram(numberOfTables: number): string {
    const tables: string[] = [];
    const tableNames: string[] = [];
    let relations = '';
    for (let index = 0; index < numberOfTables; index++) {
      const tableName = this.randomString();
      tableNames.push(tableName);
      tables.push(`
      class ${tableName} {
        ${this.randomColumns()}
      }
      `);
      if (index > 0) {
        // tslint:disable-next-line:no-bitwise
        relations += `${tableName}-- |> ${
          tableNames[~~(Math.random() * tableNames.length)] // NOSONAR  just a testing file
        }
`;
      }
    }
    return `${this.header}
      ${tables.join('\n')}
      ${relations}
      `;
  }

  private randomColumns(): string {
    let columns = '';
    for (let index = 0; index < Math.random() * 10 + 1; index++) {
      // NOSONSAR Just for testing
      columns += this.randomString() + '\n';
    }
    return columns;
  }
  private randomString(): string {
    return (Math.random() + 1).toString(36).substring(7); // NOSONAR Just for testing
  }
}
