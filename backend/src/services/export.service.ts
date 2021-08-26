import { Uri, window } from "vscode";
import fs = require('fs');
import { saveToPdf } from "./pdf.service";
export const exportService = async (fileName: string, data: {
    svg: string;
    mermaid: string;
}, fileFormat: string) => {
    window.showSaveDialog({
        defaultUri: Uri.file(fileName),
        filters: {
            fileFormat: [fileFormat],
        }
    }).then((uri: Uri | undefined) => {
        if (uri) {
            const path = uri.fsPath;

            const onDone = (error: Error) => error ?
                window.showErrorMessage(`Could not saved to file: ${path}, Error: ${error.message}`) :
                window.showInformationMessage(`Chart successfully saved to file ${path}.`);

            if (fileFormat === 'svg') {
                fs.writeFile(path, data.svg, onDone);
            }

            if (fileFormat === 'md') {
                fs.writeFile(path, data.mermaid, onDone);
            }

            if (fileFormat === 'pdf') {
                saveToPdf(path, data.svg)
                    .then(() => onDone(null))
                    .catch((error) => onDone(error));
            }

        }
    });
};
