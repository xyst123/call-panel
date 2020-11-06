import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getType,iterateMatchDOM } from '@/utils';
import '@/style/DialButton.less';

const DialButton: React.FC<any> = ({text,...props}: {
  text: string;
}) => {
  return (
    <li className="dial-button" {...props}>
      {text}
    </li>
  );
};

export default DialButton