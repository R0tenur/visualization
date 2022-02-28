

const vscode = require('../../__mocks__/vscode');

const fs = require('fs');
import * as pdf from "./pdf.service";

import { exportService } from "./export.service";

describe('exportService', () => {
    const path = { fsPath: './dummyPath' };
    beforeEach(() => {

        spyOn(vscode.window, 'showSaveDialog').and.returnValue(Promise.resolve(path));
        spyOn(vscode.window, 'showInformationMessage');
        spyOn(vscode.window, 'showErrorMessage');
        spyOn(fs, 'writeFile');

    });
    it('calls saveToPdf for pdf files', async () => {
        // Arrange
        const svg = 'dummySvg';
        const pdfSpy = spyOn(pdf, 'saveToPdf').and.returnValue(Promise.resolve());


        // Act
        await exportService('dummy', { chart: svg, mermaid: '' }, 'pdf');

        // Assert
        expect(pdfSpy).toHaveBeenCalled();
        expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('saves md files', async () => {
        // Arrange
        const svg = 'dummySvg';

        // Act
        await exportService('dummy', { chart: svg, mermaid: 'md' }, 'md');

        // Assert
        expect(fs.writeFile).toHaveBeenCalledWith(path.fsPath, 'md', expect.anything());
    });

    it('saves svg files', async () => {
        // Arrange
        const svg = 'dummySvg';

        // Act
        await exportService('dummy', { chart: svg, mermaid: 'md' }, 'svg');

        // Assert
        expect(fs.writeFile).toHaveBeenCalledWith(path.fsPath, svg, expect.anything());
    });
});

