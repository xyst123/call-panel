import React, { useState, useEffect, useCallback,useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// @ts-ignore
import {message} from 'ppfish';
import DialButtons from '@/pages/DialButtons';
import {setting,ipccSetting} from '@/constant/outer';
import {getSetting,callOut} from '@/service/phone';
import { get,debug,mapObject,handleRes,getStorage,setStorage } from '@/utils';
import usePhone from '@/hooks/phone';
import '@/style/CallDial.less';

const inputStyleMap:Common.IObject<React.CSSProperties> = {
  withContent: {
    textAlign:'center',
    fontSize: '28px'
  },
  withoutContent: {
    textAlign:'left',
    fontSize: '14px'
  },
}
const disableToolbar = get(setting,'isToolBar',false) && get(ipccSetting,'disableToolbar',false);

const CallDial: React.FC<any> = ({handleCall}) => {
  const [phone, dispatch] = usePhone();
  const [dialNumber, setDialNumber] = useState('');
  const [disableUnsigned, setDisableUnsigned] = useState(false); // 需要签署安全协议的企业（未付费使用企业）是否禁用掉外呼功能
  const [callTaskData, setCallTaskData] = useState<null|object>(null);
  const input =useRef<HTMLInputElement>(null);

  const handleSetDialNumber=useCallback((value:string)=>{
    setDialNumber(value);
    (input.current as HTMLInputElement).focus();
  },[]);

  const handleGetSetting = useCallback(async ()=>{
    const res = await getSetting();
    handleRes(res,()=>{
      setDisableUnsigned(Boolean(get(res,'data.permission.corp.CORP_SECURITY_BOOK',0)));
      return true
    })
  },[]);

  const checkAndCall= async ()=>{
    if (disableToolbar) return; // 呼叫工具条暂时不让外呼
    setCallTaskData(null);
    await handleCall(dialNumber)
  };

  useEffect(()=>{
    handleGetSetting()
  },[])

  return <div className="call-dial">
    <div className="call-dial-number">
      <input ref={input} value={dialNumber} type="text" placeholder="输入需拨打的电话号码" maxLength={66} onChange={(event)=>{
        setDialNumber(event.target.value);
      }} style={dialNumber?inputStyleMap.withContent:inputStyleMap.withoutContent}/>
      <i style={{display:dialNumber?'block':'none'}} className="iconfont icon-arrowleft" onClick={handleSetDialNumber.bind(null,dialNumber.substring(0,dialNumber.length-1))}></i>
    </div>
    
    <DialButtons handler={(button:string)=>{
      handleSetDialNumber(dialNumber+button)
    }} style={{marginTop:'12px'}}></DialButtons>
    <button className={`call-dial-call iconfont icon-call ${(disableToolbar||disableUnsigned)?'call-dial-call_disabled':''}`} onClick={checkAndCall}></button>
  </div>
};

export default CallDial;