import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getType, iterateMatchDOM } from '@/utils';
import '@/style/DialButton.less';

const DialButton: React.FC<{
  text: string;
  [key: string]: any;
}> = ({ text, ...props }) => {
  return (
    <li className="dial-button" {...props}>
      {text}
    </li>
  );
};

export default DialButton