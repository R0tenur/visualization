const background = '--vscode-editorWidget-background';
const forground = '--vscode-editorWidget-foreground';
const border = '--vscode-editorWidget-border';

const getCssVariable = (variable: string) => getComputedStyle(document.documentElement)
  .getPropertyValue(variable);
export interface Constants {
  tableWidth: number;
  padding: number;
  margin: number;
  headerHeight: number;
  fontSize: number;
  tablesOnRow: number;
  backgroundColor: string;
  fontColor: string;
  borderColor: string;
}
export default {
  tableWidth: 200,
  padding: 25,
  margin: 30,
  headerHeight: 60,
  fontSize: 12,
  tablesOnRow: 4,
  backgroundColor: getCssVariable(background),
  fontColor: getCssVariable(forground),
  borderColor: getCssVariable(border),
} as Constants;
