import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getType,iterateMatchDOM } from '@/utils';
import '@/style/DialButton.less';

interface IProps {
  text: string;
}
const DialButton: React.FC<any> = ({text,...props}: IProps) => {
  return (
    <li className="dial-button" {...props}>
      {text}
    </li>
  );
};

export default DialButton