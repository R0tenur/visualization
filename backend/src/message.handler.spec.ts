import { DashboardWebview } from "azdata";
import { messageHandler } from "./message.handler";
import * as exporter from "./services/export.service";
import * as messageFunction from "./message.function";
import * as repository from "./repositories/mssql.repository";
import { Status } from "./models/status.enum";
const vscode = require("../__mocks__/vscode");

describe("messageHandler", () => {
  const view = {
    connection: {
      connectionId: "id",
      options: {
        database: "database",
      },
    },
    postMessage: jest.fn(),
  } as unknown as DashboardWebview;
  let getMssqlDbSchemaSpy;
  // let showStatusSpy;
  // let showResultSpy;
  let showErrorSpy;
  let exportSpy;

  beforeEach(() => {
    getMssqlDbSchemaSpy = spyOn(repository, "getMssqlDbSchema");
    // showStatusSpy = spyOn(messageFunction, "showStatus");
    // showResultSpy = spyOn(messageFunction, "showResult");
    showErrorSpy = spyOn(messageFunction, "showError");
    exportSpy = spyOn(exporter, "exportService");
  });

  describe("load", () => {
    it("shows error when connectionError", async () => {
      // Arrange
      getMssqlDbSchemaSpy.and.throwError("connectionError");

      // Act
      await messageHandler(view, {
        command: "load",
        options: {},
      });

      // Assert
      expect(showErrorSpy).toHaveBeenCalledWith(
        view,
        new Error("connectionError")
      );
    });
    it("updates status when fetched tables", async () => {
      // Arrange
      getMssqlDbSchemaSpy.and.returnValue(Promise.resolve({ tables: [] }));

      // Act
      await messageHandler(view, {
        command: "load",
        options: {},
      });

      // Assert
      expect(view.postMessage).toHaveBeenCalledWith({
        status: Status.BuildingChart,
        databaseRaw: [],
      });
    });
  });
  describe("save", () => {
    it("selects value from quick pick", async () => {
      // Arrange
      const data = {
        chart: "svg",
      };
      exportSpy.and.returnValue(Promise.resolve());
      spyOn(vscode.window, "showQuickPick").and.returnValue(
        Promise.resolve("svg")
      );

      // Act
      await messageHandler(
        {} as DashboardWebview,

        {
          command: "save",

          data,
        }
      );

      // Assert
      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(["svg", "md"]);
      expect(exportSpy).toHaveBeenCalledWith(`chart.svg`, data, "svg");
    });

    it("only md aviable when svg not present", async () => {
      // Arrange
      const data = {
        mermaid: "dummymermaid",
      };
      exportSpy.and.returnValue(Promise.resolve());
      spyOn(vscode.window, "showQuickPick").and.returnValue(
        Promise.resolve("md")
      );

      // Act
      await messageHandler(view, {
        command: "save",
        data,
      });

      // Assert
      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(["md"]);
      expect(exportSpy).toHaveBeenCalledWith(`chart.md`, data, "md");
    });
  });
});
