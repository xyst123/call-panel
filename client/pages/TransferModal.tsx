import React, { useState, useEffect, useCallback, useRef } from 'react';
// @ts-ignore
import { Modal } from 'ppfish';
import '@/style/DialButton.less';

const TransferModal: React.FC<any> = ({ text, ...props }: {
  text: string;
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <Modal
      visible={visible}
    >

    </Modal>
  );
};

export default TransferModal