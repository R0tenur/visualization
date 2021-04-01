import { Uri, window } from "vscode";
import fs = require('fs');
import { dashboard, DashboardWebview } from "azdata";
import { loadWebView } from "../web.loader";
import { visualizationPanelName } from "../constants";
import { getMssqlDbSchema } from "../repositories/mssql.repository";
import { chartBuilder } from "../services/builder.service";
import { Database } from "../models/database.model";
import { Status } from "../models/status.enum";
import { saveToPdf } from "../services/pdf.service";

export const VisualizationController = () => {
    let counterHtml = loadWebView();

    dashboard.registerWebviewProvider(
        visualizationPanelName,
        async (webview: DashboardWebview) => {
            webview.html = counterHtml;
            webview.onMessage(e => recivedMessage(e));
            if (webview.connection.options.database) {
                webview.postMessage({
                    status: Status.GettingTableData,
                });
                const database = await getMssqlDbSchema(
                    webview.connection.connectionId,
                    webview.connection.options.database);
                webview.postMessage({
                    status: Status.BuildingChart,
                    errors: database.errors,
                    databaseRaw: database.tables
                });

                const chart = chartBuilder(database.tables);

                showResult(webview, chart, database);

            } else {
                webview.postMessage({
                    status: Status.NoDatabase,
                });
            }
        }
    );
};

const showResult = (webview: DashboardWebview, chart: string, database: Database) => {
    if (chart) {
        webview.postMessage({
            status: Status.Complete,
            databaseName: webview.connection.options.database,
            chart,
            errors: database.errors,
            tables: database.tables,
        });
    } else {
        webview.postMessage({
            status: Status.Error,
            errors: ['Could not build chart from the recived data'],
            databaseRaw: database.tables
        });
    }
};
const recivedMessage = async (e: any) => {
    const selected = 'svg'; //await window.showQuickPick([...['svg', 'pdf']]);
    let data = e.data;
    await exportDataWithConfirmation(`chart.${selected}`, data, selected);

};

const exportDataWithConfirmation = async (fileName: string, data: string, fileFormat: string) => {
    window.showSaveDialog({
        defaultUri: Uri.file(fileName),
        filters: {
            fileFormat: [fileFormat],
        }
    }).then((uri: Uri | undefined) => {
        if (uri) {
            const value = uri.fsPath;
            if (fileFormat === 'svg') {
                fs.writeFile(value, data, (error) => {
                    if (error) {
                        window.showErrorMessage("Could not saved to file: " + value + ": " + error.message);
                    } else {
                        window.showInformationMessage("Chart successfully saved to file '" + value + "'.");
                    }
                });
            }

            if (fileFormat === 'pdf') {
                saveToPdf(value, data)
                    .then(() => window.showInformationMessage("Chart successfully saved to file '" + value + "'."))
                    .catch((error) => window.showErrorMessage("Could not saved to file: " + value + ": " + error.message));
            }

        }
    });
}