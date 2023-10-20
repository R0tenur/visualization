import { Provider } from "../models/provider.enum";
import { runQuery } from "./base.repository";
const azdata = require("../../__mocks__/azdata");

describe("baseRepository", () => {
  it("should run query", async () => {
    // Arrange
    const provider = Provider.MSSQL;
    const connectionId = "id";
    const database = "database";
    const query = "query";
    const connectionUri = "connectionUri";

    const changeDatabase = jest.fn();
    const runQueryAndReturnSpy = jest.fn((connectionUri, query) =>
      Promise.resolve({
        rows: [[{ displayValue: "displayValue" }]],
        columnInfo: [{ columnName: "columnName" }],
      })
    );

    spyOn(azdata.connection, "getUriForConnection").and.returnValue(
      connectionUri
    );

    spyOn(azdata.dataprotocol, "getProvider").and.returnValue({
      changeDatabase: changeDatabase,
      runQueryAndReturn: runQueryAndReturnSpy,
    });
    // Act
    await runQuery(provider, connectionId, database, query);

    // Assert
    expect(changeDatabase).toHaveBeenCalledWith(connectionUri, database);
    expect(runQueryAndReturnSpy).toHaveBeenCalledWith(connectionUri, query);
  });
});
