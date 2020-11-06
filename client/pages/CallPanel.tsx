import React, { useState, useEffect, useCallback,useMemo, useRef } from 'react';
import CallHeader from '@/pages/CallHeader';
import CallDial from '@/pages/CallDial';
import CallBusy from '@/pages/CallBusy';
import {sipAdaptor} from '@/utils/sip';
// @ts-ignore
import {Modal,message} from 'ppfish';
import {IPhoneStatus,PhoneMode,SessionMode} from '@/constant/phone';
import { get, debug, iterateObject, handleRes } from '@/utils';
import {setting} from '@/constant/outer';
import {getSetting,callOut} from '@/service/phone';
import usePhone from '@/hooks/phone';
import { useSelector, useDispatch } from 'react-redux';

import '@/style/CallPanel.less';

const CallPanel: React.FC<any> = () => {
  const [phone, dispatch] = usePhone();
  const [showModal, setShowModal] = useState(false);

  const toggleToolbar = (open:boolean) => {
    dispatch({
      type: 'TOOLBAR_SET',
      payload: open
    })
  }

  const handleCall=async (dialNumber: string='')=>{
    // 软电话模式下检查sdk是否初始化完成
    if (phone.mode === 0 && sipAdaptor.status.code !==0) return message.error(sipAdaptor.status.tip);

    const realDialNumber=dialNumber.trim();

    if(!realDialNumber) return message.error('电话号码不正确，请重新输入');

    if(![1,5,6].includes(phone.status)) return message.error('电话服务需为在线或者挂起状态，才可外呼客户');

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
        speakingNumber: realDialNumber,
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
        case 4000: 
          showSecurityBookModal();
          break;
      }
      handleCallFail(res)

      // TODO 通知页面头部

      return true           
    })
  };

  // TODO
  const showSecurityBookModal=()=>{

  }

  const handleCallSuccess=()=>{

  }

  const handleCallFail=(res:Common.IRes)=>{
    dispatch({
      type: 'PHONE_SET',
      payload: {
        callStatus: 'callFail',
        tip: res.msg
      }
    })
  };

  useEffect(()=>{
    iterateObject({
      // 媒体对象检测
      mediaError(options:any){
        // @ts-ignore
        window.debug("[mediaError] 浏览器WEBRTC模块出现内部错误 data %O callUser %O", options, setting.callUser);
      },
      // 来电事件
      ringing(options:any){
        // 来电时的类型 type：1-呼入 2-呼出 3-监听 4-转接  5-预测式外呼 6-会议邀请 7-内部呼出 8-内部接听 
        // 目前1和4弹屏，2和3直接接听
        if ([2,3,7].includes(options.type)) {
          return sipAdaptor.accept();
        } else if (options.type === 6) {
          // TODO 
          this.conferenceJoinRinging();
        } else {
          // TODO 
          this.ringing(options);
        }
      },
      // pc端唤起拨号
      call(options:any){
        // 非空闲状态不处理
        if (phone.isBusy) return; 

        // YSF-32256 呼叫工具条设置隐号且不能外呼的情况下, 面板不显示号码
        const isToolbar = options.source === 'toolbar'; // 是否是呼叫工具条触发此回调
        const canCallOut = [1, 4, 5, 6].includes(phone.status); // 可外呼状态

        const hideNumber = !get(setting,'user.authority.CUSTOMER_FULLNUMBER_SHOW',true) && isToolbar && !canCallOut;

        dispatch({
          type: 'PHONE_SET',
          payload: {
            speakingNumber: hideNumber ? '' : options.number
          }
        })

        if(hideNumber) {
          message.error('电话功能初始化失败，请刷新或稍后重试!');
        }

        if (options.autocall) {
          if(!hideNumber) {
            this.handleCall();
          }
          toggleToolbar(true);
        } else {
          toggleToolbar(true);
        }
      },
      // 提示用户重启浏览器
      warning(options:any){
        setShowModal(true);
      },
      // 拨号中上报延迟信息
      jitterBuffer(options:any){
        dispatch({
          type: 'PHONE_SET',
          payload: {
            jitterBuffer: options.jitterBuffer
          }
        })
      }
    },(handler,event)=>{
      sipAdaptor.addEventListener(event,handler)
    })

    // 软电话模式下，初始化sip账号
    if(phone.mode === PhoneMode.soft){
      sipAdaptor.init();
    }
  },[])

  return <div className="call-panel">
    <CallHeader></CallHeader>
    {
      !phone.isBusy ? <CallBusy></CallBusy> : <CallDial handleCall={handleCall}></CallDial>
    }
    <Modal
      visible={showModal}
      cancelButtonDisabled={true}
      onOk={setShowModal.bind(null,false)}
      esc={true}
    >
      <p>浏览器WEBRTC模块出现内部错误，请重启浏览器恢复</p>
    </Modal>
  </div>
};

export default CallPanel;