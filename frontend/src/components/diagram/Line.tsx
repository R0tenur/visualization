import React from 'react';
import constants from '../../settings/constants';
export default (props: any) => {
  const { to, via, from} = props;

  return (
    <>
      <defs>
        <marker id="arrow" fill={constants.borderColor} markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" />
        </marker>
      </defs>
      <polyline points={`${from.x},${from.y} ${via.map((v: any) => ` ${v.x},${v.y}`)} ${to.x-8},${to.y}`} style={styles} markerEnd="url(#arrow)" />
    </>
  );
};
const styles = {
  stroke: constants.borderColor,
  strokeWidth: 1,
  fill: 'none',
}