import { ExtensionContext } from 'vscode';
import { VisualizationController } from './controllers/visualization.controller';

export const activate = (context: ExtensionContext) => VisualizationController();

export const deactivate = () => { };

