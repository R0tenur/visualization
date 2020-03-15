import React from 'react';
import constants from './settings/constants';

function App() {
  return (
    <div
      style={{
        backgroundColor: constants.backgroundColor,
        color: constants.fontColor,
        border: constants.borderBorder,
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
