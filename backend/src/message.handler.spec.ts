import { messageHandler } from "./message.handler";
import * as exporter from "./services/export.service";

const vscode = require('../__mocks__/vscode');



describe('exportService', () => {

    it('selects value from quick pick', async () => {
        // Arrange
        const data = {
            chart: 'svg'
        };
        const exportSpy = spyOn(exporter, 'exportService').and.returnValue(Promise.resolve());
        spyOn(vscode.window, 'showQuickPick').and.returnValue(Promise.resolve('svg'));

        // Act
        await messageHandler({
            data
        });

        // Assert
        expect(vscode.window.showQuickPick).toHaveBeenCalledWith(['svg', 'md']);
        expect(exportSpy).toHaveBeenCalledWith(`chart.svg`, data, 'svg');
    });

    it('only md aviable when svg not present', async () => {
        // Arrange
        const data = {
            mermaid: 'dummymermaid'
        };
        const exportSpy = spyOn(exporter, 'exportService').and.returnValue(Promise.resolve());
        spyOn(vscode.window, 'showQuickPick').and.returnValue(Promise.resolve('md'));

        // Act
        await messageHandler({
            data
        });

        // Assert
        expect(vscode.window.showQuickPick).toHaveBeenCalledWith(['md']);
        expect(exportSpy).toHaveBeenCalledWith(`chart.md`, data, 'md');
    });
});

