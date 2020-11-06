import React, { useEffect, useState } from 'react';
import {SessionMode,PhoneMode,callStatusMap} from '@/constant/phone';
import DialButtons from '@/pages/DialButtons';
import { get,hidePhoneNumber } from '@/utils';
import usePhone from '@/hooks/phone';
import {corpPermission} from '@/constant/outer';
import '@/style/CallBusy.less';

// @ts-ignore
window.ipccSetting={
  disableToolbar:false
}

const conferenceInit = {
  tip: '',
  chairmanId: '',
  chairmanName: '',
  conferenceId: '',
  sessionId: '',
  members: {},
}


const CallBusy: React.FC<any> = () => {
  const [phone, dispatch] = usePhone();
  const [extNumber,setExtNumber] = useState('');
  const [showDial,setShowDial] = useState(false);

  const {callStatus,sessionMode} = phone;
  const isRinging = ['callIn', 'callOut', 'joinIn', 'callFail'].includes(callStatus);

  let callType = '',  realNumber = '', realArea = '', realTip = '', username = '', vipLevel = 0, callTransfer:any = {}, showToggleDial = false;

  if(sessionMode === SessionMode.intercom){
    // 内部通话：远端客服、通话标识
    callType = 'intercom';
    realNumber = get(phone,'intercom.remoteStaffName','');
    realArea = get(phone,'intercom.intercomFlag','');
  } else {
    // 外部通话
    if (['joinin', 'conference'].includes(callStatus)) {
      // 外部通话-多方：主持人、信息标识
      callType = 'conference';
      realNumber = get(phone,'conference.chairmanName','');
      realTip = get(phone,'conference.tip','');
    } else {
      // 外部通话-会话: 用户号码、通话标识、拨号盘开关、地域标识
      callType = 'session';
      const speakingNumbers = get(phone,'session.speakingNumbers','');
      realNumber=get(phone,'session.hideCustomerNumber',false) ? hidePhoneNumber(speakingNumbers) : speakingNumbers;
      showToggleDial = callStatus==='speaking' &&  phone.mode !== PhoneMode.sip;
      realArea=get(phone,'session.mobileArea','');
      username=get(phone,'session.username','');
      vipLevel=get(phone,'session.vipLevel','');
      callTransfer=get(phone,'session.callTransfer',{});
    }
  }

  // 外部通话-会话：静音、暂停、挂机、转接、多方  
  // 内部通话-主叫：静音、暂停、挂机  
  // 内部通话-被叫：挂机
  interface IIconButton {
    show: boolean,
    icon: string,
    color?:string,
    text: string,
    handler: any,
  }
  interface IRadiusButton {
    show: boolean,
    color:string,
    text: string,
    handler: any,
  }
  const iconButtonMap:{
    [key:string]: Array<IIconButton|IRadiusButton>
  } = {
    pause: [
      {
        show: true,
        color: 'green',
        text: '恢复通话',
        handler(){},
      },
    ],
    mute: [
      {
        show: true,
        color: 'yellow',
        text: '取消静音',
        handler(){},
      },
    ],
    speaking: [
      {
        show: (sessionMode !== SessionMode.intercom || phone.isCaller) && phone.mode !== PhoneMode.sip,
        icon: 'mute',
        text: '静音',
        handler(){},
      },
      {
        show: sessionMode !== SessionMode.intercom || phone.isCaller,
        icon: 'pause',
        text: '暂停',
        handler(){},
      },
      {
        show: sessionMode !== SessionMode.intercom,
        icon: 'transfer',
        text: '转接',
        handler(){},
      },
      {
        show: sessionMode !== SessionMode.intercom && corpPermission.CALLCENTER_CONFERENCE && phone.cachedStatus !== 8,
        icon: 'members-circle',
        text: '多方',
        handler(){},
      },
      {
        show: phone.mode !== PhoneMode.sip,
        icon: 'hangup',
        color: '#ff767d',
        text: '挂机',
        handler(){},
      },
    ],
    conference: [
      {
        show: phone.mode !== PhoneMode.sip,
        icon: 'hangup',
        color: '#ff767d',
        text: '退出',
        handler(){},
      },
    ],
    callFail: [
      {
        show: true,
        color: 'gray',
        text: '取消',
        handler(){},
      },
      {
        show: true,
        color: 'green',
        text: '重播',
        handler(){},
      },
    ],
    callIn: [
      {
        show: phone.mode !== PhoneMode.sip && (sessionMode === SessionMode.intercom || !phone.inNextAnswer),
        color: 'green',
        text: '接起',
        handler(){},
      },
      {
        show: phone.mode !== PhoneMode.sip && sessionMode !== SessionMode.intercom && phone.inNextAnswer,
        color: 'gray',
        text: `顺振中 (${phone.inNextAnswerCounter}s）`,
        handler(){},
      },
    ],
    joinIn: [
      {
        show: phone.mode !== PhoneMode.sip,
        color: 'green',
        text: '加入',
        handler(){},
      },
    ],
    process: [
      {
        show: true,
        color: 'green',
        text: '完成处理',
        handler(){},
      },
    ],
    callOut: [
      {
        show: phone.mode !== PhoneMode.sip,
        icon: 'callout',
        color: '#ff767d',
        text: '',
        handler(){},
      },
    ],
  };

  const renderIconButton = (button:IIconButton,id:string) => button.show?<li key={id} className="icon-buttons-item" onClick={button.handler}>
    <i className={`iconfont icon-${button.icon}`} style={button.color?{color:button.color}:{}}></i>
    {button.text?<p>{button.text}</p>:null}
  </li>:null;

  const renderRadiusButton = (button:IRadiusButton,id:string) =>button.show?<li key={id} className={`radius-buttons-item radius-buttons-item_${button.color}`} onClick={button.handler}>{button.text}</li>:null;

  const renderButtons = (status:keyof (typeof iconButtonMap)) => {
    const buttons = iconButtonMap[status];
    const type = get(buttons[0],'icon','')?'icon':'radius';
    if(type==='icon'){
      return <ul className="call-busy-icon-buttons">
        {buttons.map((button,index)=>renderIconButton(button as IIconButton,`${status}-${index}`))}
      </ul>;
    }
    if(type==='radius'){
      return <ul className="call-busy-radius-buttons">
        {buttons.map((button,index)=>renderRadiusButton(button as IRadiusButton,`${status}-${index}`))}
      </ul>;
    }
  }

  const renderByCallStatus = () => {
    switch (callStatus) {
      case 'pause':
        return renderButtons('pause');
      case 'mute':
        return renderButtons('mute');
      case 'speaking':
        return renderButtons('speaking');
      case 'conference':
        return renderButtons('conference');
      case 'callFail':
        return renderButtons('callFail');
      case 'callIn':
        return phone.mode === PhoneMode.sip ? <p className="call-busy-text">请通过SIP话机接起客户</p> : renderButtons('callIn');
      case 'joinIn':
        return phone.mode === PhoneMode.sip ? <p className="call-busy-text">请通过SIP话机接起客户</p> : renderButtons('joinIn');
      case 'process':
        return renderButtons('process');
      case 'callOut':
        return renderButtons('callOut');
      default:
        return null
    }
  }

  useEffect(()=>{
    
  },[])

  return <div className="call-busy">
    {/* 【通话-号码信息】 */}
    {realNumber?<p className="call-busy-number">{realNumber}</p>:null}
    {/* TODO 会议-tip */}
    {realTip?<p className="call-busy-tip">{realTip}</p>:null}
    {/* TODO 会话-拨号面板 */}
    {showToggleDial?<i className="call-busy-toggle iconfont icon-downloadcenterx" onClick={setShowDial.bind(null,!showDial)}></i>:null}
    {realArea?<p className="call-busy-area">{realArea}</p>:null}

    {/* 【振铃-动画区】 */}
    <div className={`call-busy-avatar ${isRinging?'call-busy-avatar_ringing':''}`}>
      {[0,1,2].map((item)=><div key={item}></div>)}
      <i></i>
    </div>

    {/* 【通话-用户信息】 */}
    {callType==='intercom'?
      <p className="call-busy-name"></p>: 
      callType==='session'?
        <>
          {username?<p className="call-busy-name">{username}</p>:null}
          {vipLevel?<i className={`call-busy-vip iconfont icon-vip${vipLevel}`}></i>:null}
          {callTransfer.type===1?<p className="call-busy-tip">转接自 {callTransfer.transferFrom}</p>:null}
        </>:
        null
    }

    {/* 【通话-状态提示信息】 */}
    <p className="call-busy-tip">{callStatusMap[callStatus]}</p>
    {callStatus==='process' && true?<p className="call-busy-count">在<span className="call-busy-count-number">{` ${6}s `}</span>后将自动进入下一则通话</p>:null}

    {/* 【通话操作】 */}
    {renderByCallStatus()}

    {/* 【外部通话：拨号盘】 */}
    <div className={`call-busy-dial call-busy-dial_${showDial?'show':'hide'}`}>
      <input type="text" value={extNumber} readOnly={true} />
      <DialButtons className="buttons" handler={(button:string)=>{
        setExtNumber(extNumber+button)
      }}></DialButtons>
    </div>
  </div>
};

export default CallBusy;