import React from 'react';
import DialButton from '@/components/DialButton';
import '@/style/DialButtons.less';

const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const DialButtons: React.FC<{
  handler: Function,
  className?: string,
  [key: string]: any;
}> = ({ handler, className, ...props }) => {
  return (
    <ul className={`dial-buttons ${className}`} {...props}>
      {
        buttons.map(button => <DialButton key={button} text={button} onClick={handler.bind(null, button)} />)
      }
    </ul>
  );
};

export default DialButtons