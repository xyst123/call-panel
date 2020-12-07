import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// @ts-ignore
import DialButtons from '@/pages/DialButtons';
import { setting, ipccSetting } from '@/constant/outer';
import { getSetting, callOut } from '@/service/phone';
import { get, debug, mapObject, handleRes } from '@/utils';
import usePhone from '@/hooks/phone';
import '@/style/CallDial.less';

const inputStyleMap: Common.IObject<React.CSSProperties> = {
  withContent: {
    textAlign: 'center',
    fontSize: '28px'
  },
  withoutContent: {
    textAlign: 'left',
    fontSize: '14px'
  },
}
const disableToolbar = get(setting, 'isToolBar', false) && get(ipccSetting, 'disableToolbar', false);

const CallDial: React.FC<any> = () => {
  const { phone, startCallOut } = usePhone();
  const [disableUnsigned, setDisableUnsigned] = useState(false); // 需要签署安全协议的企业（未付费使用企业）是否禁用掉外呼功能
  const [callTaskData, setCallTaskData] = useState<null | object>(null);
  const input = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();

  const handleSetDialNumber = (value: string) => {
    dispatch({
      type: 'PHONE_SET',
      payload: {
        dialingNumber: value
      }
    });
    input.current?.focus();
  }

  const handleGetSetting = async () => {
    const res = await getSetting();
    handleRes(res, () => {
      setDisableUnsigned(Boolean(get(res, 'data.permission.corp.CORP_SECURITY_BOOK', 0)));
    })
  }

  const checkAndCall = async () => {
    if (disableToolbar) return; // 呼叫工具条暂时不让外呼
    setCallTaskData(null);
    await startCallOut()
  };

  useEffect(() => {
    handleGetSetting()
  }, [])

  return <div className="call-dial">
    <div className="call-dial-number">
      <input ref={input} value={phone.dialingNumber} type="text" placeholder="输入需拨打的电话号码" maxLength={66} onChange={(event) => {
        dispatch({
          type: 'PHONE_SET',
          payload: {
            dialingNumber: event.target.value
          }
        });
      }} style={phone.dialingNumber ? inputStyleMap.withContent : inputStyleMap.withoutContent} />
      <i style={{ display: phone.dialingNumber ? 'block' : 'none' }} className="iconfont icon-arrowleft" onClick={handleSetDialNumber.bind(null, phone.dialingNumber.substring(0, phone.dialingNumber.length - 1))}></i>
    </div>

    <DialButtons handler={(button: string) => {
      dispatch({
        type: 'PHONE_SET',
        payload: {
          dialingNumber: phone.dialingNumber + button
        }
      });
    }} style={{ marginTop: '12px' }}></DialButtons>
    <button className={`call-dial-call iconfont icon-call ${(disableToolbar || disableUnsigned) ? 'call-dial-call_disabled' : ''}`} onClick={checkAndCall}></button>
  </div>
};

export default CallDial;