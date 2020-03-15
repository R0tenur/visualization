import React from 'react';
import constants from '../../settings/constants';
export default (props: any) => {
  const { title } = props;
  return (
    <>
      <text x={constants.padding} y={constants.padding} fill={constants.fontColor}>
        {title}
      </text>
    </>
  );
};
