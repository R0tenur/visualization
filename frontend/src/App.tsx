import React from 'react';
const background = '--vscode-tab-inactiveBackground';
const forground = '--vscode-tab-inactiveForeground';
const border = '--vscode-tab-border';
const getCssVariable = (variable: string) => getComputedStyle(document.documentElement)
  .getPropertyValue(variable);

function App() {
  return (
    <div
      style={{
        backgroundColor: getCssVariable(background),
        color: getCssVariable(forground),
        border: getCssVariable(border),
        fontWeight: 'bold',
        borderWidth: '2px',
        width: '100px',
        height: '100px'
      }}>
      Nothing
    </div>
  );
}

export default App;
