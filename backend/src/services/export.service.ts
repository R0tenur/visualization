const vscode = require("vscode");
import fs = require("fs");
import { Uri } from "vscode";
import { saveToPdf } from "./pdf.service";
export const exportService = async (
  fileName: string,
  data: {
    chart: string;
    mermaid: string;
  },
  fileFormat: string
) => {
  const uri = await vscode.window.showSaveDialog({
    defaultUri: Uri.file(fileName),
    filters: {
      fileFormat: [fileFormat],
    },
  });
  if (uri) {
    const path = uri.fsPath;

    const onDone = (error: Error) =>
      error
        ? vscode.window.showErrorMessage(
            `Could not saved to file: ${path}, Error: ${error.message}`
          )
        : vscode.window.showInformationMessage(
            `Chart successfully saved to file ${path}.`
          );

    if (fileFormat === "svg") {
      fs.writeFile(path, data.chart, onDone);
    }

    if (fileFormat === "md") {
      fs.writeFile(path, data.mermaid, onDone);
    }

    if (fileFormat === "pdf") {
      saveToPdf(path, data.chart)
        .then(() => onDone(null))
        .catch((error) => onDone(error));
    }
  }
};
