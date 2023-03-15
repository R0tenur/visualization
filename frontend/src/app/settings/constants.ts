const background = '--vscode-editorWidget-background';
const forground = '--vscode-editorWidget-foreground';
const border = '--vscode-editorWidget-border';

const getCssVariable = (variable: string) => getComputedStyle(document.documentElement)
  .getPropertyValue(variable);

export interface Constants {
  tableWidth: number;
  padding: number;
  titleMargin: number;
  titleHeight: number;
  columnHeight: number;
  columnMargin: number;
  fontSize: number;
  borderWidth: number;
  backgroundColor: string;
  fontColor: string;
  borderColor: string;
}
export default {
  tableWidth: 200,
  padding: 18,
  titleMargin: 30,
  titleHeight: 25,
  borderWidth: 2,
  columnHeight: 20,
  fontSize: 16,
  backgroundColor: getCssVariable(background) || getComputedStyle(document.body).backgroundColor,
  fontColor: getCssVariable(forground) || getComputedStyle(document.body).color,
  borderColor: getCssVariable(border) || getComputedStyle(document.body).color,
} as Constants;
