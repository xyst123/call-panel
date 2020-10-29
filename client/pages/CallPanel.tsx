import React, { useState, useEffect, useCallback,useMemo, useRef } from 'react';
import CallHeader from '@/pages/CallHeader';
import CallDial from '@/pages/CallDial';
import {sipAdaptor} from '@/utils/sip';
import { useSelector, useDispatch } from 'react-redux';

import '@/style/CallPanel.less';

const CallPanel: React.FC<any> = () => {
  const phone = useSelector((state: {
      phone: Phone.IStatus;
  }) => state.phone);

  useEffect(()=>{
    // 软电话模式下，初始化sip账号
    if(phone.mode === 0) sipAdaptor.init();
  },[])

  return <div className="call-panel">
    <CallHeader></CallHeader>
    <CallDial></CallDial>
  </div>
};

export default CallPanel;