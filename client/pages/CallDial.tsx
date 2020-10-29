import React, { useState, useEffect, useCallback,useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
// @ts-ignore
import {message} from 'ppfish';
import DialButton from '@/components/DialButton';
import {SessionMode,sipAdaptorStatusMap} from '@/configs/data';
import {getSetting,callOut} from '@/service/phone';
import { get,debug,mapObject,handleRes,getStorage,setStorage } from '@/utils';
import {sipAdaptor} from '@/utils/sip';
import '@/style/CallDial.less';

// @ts-ignore
window.ipccSetting={
  disableToolbar:false
}

const CALL_OUT_SECURITY_ERROR_CODE = 4000;
const buttons = ['1', '2', '3', '4', '5','6','7','8','9','*','0','#'];
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
const disableToolbar = get(window,'setting.isToolBar',false) && get(window,'ipccSetting.disableToolbar',false);

const CallDial: React.FC<any> = () => {
  const phone = useSelector((state: {
    phone: Phone.IStatus;
}) => state.phone);
  const [dialNumber, setDialNumber] = useState('');
  const [disableUnsigned, setDisableUnsigned] = useState(false); // 需要签署安全协议的企业（未付费使用企业）是否禁用掉外呼功能
  const [callTaskData, setCallTaskData] = useState<null|object>(null);
  const input =useRef<HTMLInputElement>(null);

  const dispatch = useDispatch();

  const handleSetDialNumber=useCallback((value:string)=>{
    setDialNumber(value);
    (input.current as HTMLInputElement).focus();
  },[]);

  const handleGetSetting=useCallback(async ()=>{
    const res = await getSetting();
    handleRes(res,()=>{
      setDisableUnsigned(Boolean(get(res,'data.permission.corp.CORP_SECURITY_BOOK',0)));
      return true
    })
  },[]);

  const checkAndCall= async ()=>{
    if (disableToolbar) return; // 呼叫工具条暂时不让外呼
    setCallTaskData(null);
    await handleCall()
  };

  const handleCall=async ()=>{
    // 软电话模式下检查sdk是否初始化完成
    if (phone.mode === 0 && sipAdaptor.status.code !==0) return message.error(sipAdaptorStatusMap[sipAdaptor.status.code].tip);

    const realDialNumber=dialNumber.trim();

    if(!realDialNumber) return message.error('电话号码不正确，请重新输入');

    if(![1,5,6].includes(phone.originStatus)) return message.error('电话服务需为在线或者挂起状态，才可外呼客户');

    dispatch({
      type: 'PHONE_SET',
      payload: {
        sessionMode: SessionMode.empty
      }
    })

    const outCallNumber=phone.outCallRandom?'':phone.outCallNumber;

    if(!phone.outCallRandom && !outCallNumber) return message.error('请选择外呼号码');

    debug(`[sendCallOut] number: ${phone.outCallNumber}`);

    dispatch({
      type: 'PHONE_SET',
      payload: {
        callingNumber: realDialNumber,
        isBusy:true,
        callStatus: 'callOut'
      }
    })
    
    const res = await callOut(realDialNumber, outCallNumber);
    handleRes(res,()=>{
      handleCallSuccess()
      return true
    },()=>{
      // 如果刚好有进线，那么不处理外呼失败提示
      if(phone.status === 7) return true;
      switch(res.code){
        case 8150: 
          message.error(res.msg)
          break;
        case CALL_OUT_SECURITY_ERROR_CODE: 
          showSecurityBookModal();
          break;
      }
      handleCallFail(res)

      // TODO 通知页面头部

      return true           
    })
  };

  const handleCallSuccess=()=>{
   
  }

  const handleCallFail=(res:Common.IRes)=>{
    dispatch({
      type: 'PHONE_SET',
      payload: {
        isBusy:true,
        callStatus: 'callFail',
        tip: res.msg
      }
    })
  };

  // TODO
  const showSecurityBookModal=()=>{

  }

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
    
    <ul className="call-dial-buttons">
      {
        buttons.map(button => <DialButton key={button} text={button} onClick={handleSetDialNumber.bind(null,dialNumber+button)}/>)
      }
    </ul>
    <button className={`call-dial-call iconfont icon-call ${(disableToolbar||disableUnsigned)?'call-dial-call_disabled':''}`} onClick={checkAndCall}></button>
  </div>
};

export default CallDial;