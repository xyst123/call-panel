import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import DialButtons from '@/pages/DialButtons';
import { derivation } from '@/constant/outer';
import { getDisableUnsigned } from '@/service/phone';
import { get } from '@/utils';
import usePhone from '@/hooks/phone';
import { actionCallOut } from '@/redux/actions/phone';
import '@/style/CallDial.less';

const { isToolBar, disableToolbar } = derivation;
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
const realDisableToolbar = isToolBar && disableToolbar;

const CallDial: React.FC<Common.IObject<any>> = () => {
  const { phone } = usePhone();
  const [disableUnsigned, setDisableUnsigned] = useState(false); // 需要签署安全协议的企业（未付费使用企业）是否禁用掉外呼功能
  const input = useRef<HTMLInputElement>(null!);
  const dispatch = useDispatch();

  const handleSetDialNumber = (value: string) => {
    dispatch({
      type: 'PHONE_SET',
      payload: {
        dialingNumber: value
      }
    });
    input.current.focus();
  }

  const handleSetDisableUnsigned = async () => {
    const disable = await getDisableUnsigned();
    setDisableUnsigned(disable);
  }

  const checkAndCall = async () => {
    if (realDisableToolbar) return; // 呼叫工具条暂时不让外呼
    dispatch({
      type: 'PHONE_RESET', payload: {
        callTaskData: true
      }
    })
    dispatch(actionCallOut() as any)
  };

  useEffect(() => {
    handleSetDisableUnsigned()
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
    <button className={`call-dial-call iconfont icon-hangup ${(realDisableToolbar || disableUnsigned) ? 'call-dial-call_disabled' : ''}`} onClick={checkAndCall}></button>
  </div>
};

export default CallDial;