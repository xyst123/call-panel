import React, { useEffect, useRef, useState } from 'react';
import { SessionMode, SessionType, SessionStatus, PhoneMode, callStatusMap } from '@/constant/phone';
import DialButtons from '@/pages/DialButtons';
import { get, hidePhoneNumber, callPanelDebug } from '@/utils';
import { sipAdaptor } from '@/utils/sip';
import usePhone from '@/hooks/phone';
import { actionCallOut, actionIntercomCallOut, actionSetStatus, actionStartConference, actionJoin, handleTransfer, actionReset, actionAccept, actionCallTask } from '@/redux/actions/phone';
import { derivation, setting, corpPermission } from '@/constant/outer';
import { audioConnectSound, audioHangupSound, audioRingSound } from '@/constant/element';
import { sessionCheck, intercomMute, intercomUnmute, mute, unmute } from '@/service/phone';
import { notifyToolbar } from '@/utils/phone';
import globalVar from '@/globalVar';
import { useDispatch } from 'react-redux';
import '@/style/CallBusy.less';

const { user, callUser, hideCustomerNumber } = derivation;

const CallBusy: React.FC<Common.IObject<any>> = () => {
  const { phone } = usePhone();
  const [extNumber, setExtNumber] = useState('');
  const countDownTimer = useRef<NodeJS.Timeout | null>(null);
  const [countDownNumber, setCountDownNumber] = useState(callUser.maxDealTime);

  const { callStatus, sessionMode } = phone;
  const isRinging = ['callIn', 'callOut', 'joinIn', 'callOutFail'].includes(callStatus);
  const dispatch = useDispatch();

  let callType = '', realNumber = '', realArea = '', realTip = '', username = '', vipLevel = 0, callTransfer: any = {}, showToggleDial = false;

  if (sessionMode === SessionMode.intercom) {
    // 内部通话：远端客服、通话标识
    callType = 'intercom';
    realNumber = get(phone, 'intercom.remoteStaffName', '');
    realArea = get(phone, 'intercom.intercomFlag', '');
  } else {
    // 外部通话
    if (['joinin', 'conference'].includes(callStatus)) {
      // 外部通话-多方：主持人、信息标识
      callType = 'conference';
      realNumber = get(phone, 'conference.chairmanName', '');
      realTip = get(phone, 'conference.tip', '');
    } else {
      // 外部通话-会话: 用户号码、通话标识、拨号盘开关、地域标识
      callType = 'session';
      const speakingNumber = get(phone, 'speakingNumber', '');
      realNumber = hideCustomerNumber ? hidePhoneNumber(speakingNumber) : speakingNumber;
      showToggleDial = callStatus === 'speaking' && phone.mode !== PhoneMode.sip;
      realArea = get(phone, 'session.mobileArea', '');
      username = get(phone, 'session.username', '');
      vipLevel = get(phone, 'session.vipLevel', '');
      callTransfer = get(phone, 'session.callTransfer', {});
    }
  }

  // 外部通话-会话：静音、暂停、挂机、转接、多方  
  // 内部通话-主叫：静音、暂停、挂机  
  // 内部通话-被叫：挂机
  interface IIconButton {
    show: boolean,
    icon: string,
    color?: string,
    size?: number,
    text: string,
    handler: any,
  }
  interface IRadiusButton {
    show: boolean,
    color: string,
    text: string,
    handler: any,
  }

  const handleBye = () => {
    callPanelDebug('[colBye]');
    sipAdaptor.callSDK('bye');

    if (globalVar.sessionType === SessionType.callIn) {
      globalVar.sessionStatus = SessionStatus.bye;
    }

    const isSessionSeat = phone.isBusy && phone.callStatus !== 'conference';
    const isConferenceChairman = phone.callStatus === 'conference';
    if (audioHangupSound && (isSessionSeat || isConferenceChairman)) {
      audioHangupSound.hangUpFrom = 1;
    }
    if (phone.session.sessionId) {
      sessionCheck(phone.session.sessionId);
    }

    globalVar.autoAnswerTimer = setTimeout(() => {
      // 解决因为外呼异常，无法挂机的问题
      // 1s后如果还是没能正常挂机，强制恢复状态
      if (phone.isBusy && phone.callStatus === 'callOut') {
        actionReset(phone, dispatch)
      }
    }, 1000);
  };

  const iconButtonMap: {
    [key: string]: Array<IIconButton | IRadiusButton>
  } = {
    pause: [
      {
        show: true,
        color: 'green',
        text: '恢复通话',
        handler() {
          callPanelDebug('[sendResume]');
          if (phone.sessionMode === SessionMode.intercom) {
            intercomUnmute(phone.intercom.intercomId);
          } else {
            unmute(phone.session.sessionId)
          }
          dispatch({
            type: 'PHONE_SET',
            payload: {
              callStatus: 'speaking',
              tip: callStatusMap.speaking
            }
          })
        },
      },
    ],
    mute: [
      {
        show: true,
        color: 'yellow',
        text: '取消静音',
        handler() {
          callPanelDebug('[sendUnmute]');
          sipAdaptor.callSDK('unmute');
          dispatch({
            type: 'PHONE_SET',
            payload: {
              callStatus: 'speaking',
              tip: callStatusMap.speaking
            }
          })
        },
      },
    ],
    speaking: [
      {
        show: (sessionMode !== SessionMode.intercom || phone.isCaller) && phone.mode !== PhoneMode.sip,
        icon: 'mute',
        text: '静音',
        handler() {
          callPanelDebug('[sendMute]');
          sipAdaptor.callSDK('mute');
          dispatch({
            type: 'PHONE_SET',
            payload: {
              callStatus: 'mute',
              tip: callStatusMap.mute
            }
          })
        },
      },
      {
        show: sessionMode !== SessionMode.intercom || phone.isCaller,
        icon: 'pause',
        text: '暂停',
        handler() {
          callPanelDebug('[sendPause]');
          if (phone.sessionMode === SessionMode.intercom) {
            intercomMute(phone.intercom.intercomId);
          } else {
            mute(phone.session.sessionId)
          }
          dispatch({
            type: 'PHONE_SET',
            payload: {
              callStatus: 'pause',
              tip: callStatusMap.pause
            }
          })
        },
      },
      {
        show: sessionMode !== SessionMode.intercom,
        icon: 'transfer',
        text: '转接',
        handler() {
          dispatch({
            type: 'GLOBAL_SET_SELECT_MODAL',
            payload: { type: 'transfer', handler: handleTransfer }
          })
        },
      },
      {
        show: sessionMode !== SessionMode.intercom && corpPermission.CALLCENTER_CONFERENCE && phone.statusCached !== 8,
        icon: 'members-circle',
        text: '多方',
        handler() {
          dispatch({
            type: 'GLOBAL_SET_SELECT_MODAL',
            payload: {
              type: 'conference', handler() {
                dispatch(actionStartConference('create'))
              }
            }
          })
        },
      },
      {
        show: phone.mode !== PhoneMode.sip,
        icon: 'hangup',
        color: '#ff767d',
        text: '挂机',
        handler: handleBye
      },
    ],
    conference: [
      {
        show: phone.mode !== PhoneMode.sip,
        icon: 'hangup',
        color: '#ff767d',
        text: '退出',
        handler: handleBye
      },
    ],
    callOutFail: [
      {
        show: true,
        color: 'gray',
        text: '取消',
        handler: actionReset
      },
      {
        show: true,
        color: 'green',
        text: '重拨',
        handler() {
          if (phone.callTaskData) {
            dispatch(actionCallTask(phone.callTaskData) as any);
          }
          else {
            if (phone.sessionMode === SessionMode.intercom) {
              dispatch(actionIntercomCallOut() as any);
            } else {
              dispatch(actionCallOut() as any)
            }
          }
        },
      },
    ],
    callIn: [
      {
        show: phone.mode !== PhoneMode.sip && (sessionMode === SessionMode.intercom || !phone.inNextAnswer),
        color: 'green',
        text: '接起',
        handler() {
          dispatch(actionAccept())
        }
      },
      {
        show: phone.mode !== PhoneMode.sip && sessionMode !== SessionMode.intercom && phone.inNextAnswer,
        color: 'gray',
        text: `顺振中 (${phone.inNextAnswerCounter}s）`,
        handler() { },
      },
    ],
    joinIn: [
      {
        show: phone.mode !== PhoneMode.sip,
        color: 'green',
        text: '加入',
        handler() {
          dispatch(actionJoin())
        }
      },
    ],
    process: [
      {
        show: true,
        color: 'green',
        text: '完成处理',
        async handler() {
          callPanelDebug("[overprocess] callUser %O", callUser);
          actionSetStatus({
            phone, dispatch, options: {
              value: [callUser.settedStatus, callUser.settedStatusExt],
              type: 'over-process',
            }
          });

          notifyToolbar({
            cmd: 'overProcess',
            data: {
              address: phone.session.mobileArea,
              usernumber: phone.speakingNumber,
              sessionid: phone.session.sessionId,
              staffid: user.id,
              staffname: user.username
            }
          })
        },
      },
    ],
    callOut: [
      {
        show: phone.mode !== PhoneMode.sip,
        icon: 'hangup',
        color: '#ff767d',
        size: 50,
        text: '',
        handler: handleBye
      },
    ],
  };

  const renderIconButton = (button: IIconButton, id: string) => button.show ? <li key={id} className="icon-buttons-item" onClick={button.handler}>
    <i className={`iconfont icon-${button.icon}`} style={{ color: button.color || '#939393', fontSize: `${button.size || 22}px` }}></i>
    {button.text ? <p>{button.text}</p> : null}
  </li> : null;

  const renderRadiusButton = (button: IRadiusButton, id: string) => button.show ? <li key={id} className={`radius-buttons-item radius-buttons-item_${button.color}`} onClick={button.handler}>{button.text}</li> : null;

  const renderButtons = (status: keyof (typeof iconButtonMap)) => {
    const buttons = iconButtonMap[status];
    const type = get(buttons[0], 'icon', '') ? 'icon' : 'radius';
    if (type === 'icon') {
      return <ul className="call-busy-icon-buttons">
        {buttons.map((button, index) => renderIconButton(button as IIconButton, `${status}-${index}`))}
      </ul>;
    }
    if (type === 'radius') {
      return <ul className="call-busy-radius-buttons">
        {buttons.map((button, index) => renderRadiusButton(button as IRadiusButton, `${status}-${index}`))}
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
      case 'callOutFail':
        return renderButtons('callOutFail');
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

  const clearCountDownTimer = () => {
    if (countDownTimer.current) {
      clearInterval(countDownTimer.current);
    }
  }

  useEffect(() => {
    if (callStatus !== 'process' || countDownNumber < 2) {
      clearCountDownTimer()
    } else {
      countDownTimer.current = setTimeout(() => {
        setCountDownNumber(countDownNumber - 1);
      }, 1000)
    }
  }, [callStatus, countDownNumber])

  useEffect(() => {
    const volume = get(setting, 'callUser.ringVolume', 100) / 100;
    audioConnectSound && (audioConnectSound.volume = volume);
    audioHangupSound && (audioHangupSound.volume = volume);
    audioRingSound && (audioRingSound.volume = volume);
    return clearCountDownTimer
  }, [])

  return <div className="call-busy">
    {/* 【通话-号码信息】 */}
    {realNumber ? <p className="call-busy-number">{realNumber}</p> : null}
    {/* TODO 会议-tip */}
    {realTip ? <p className="call-busy-tip">{realTip}</p> : null}
    {/* TODO 会话-拨号面板 */}
    {showToggleDial ? <i className={`call-busy-toggle iconfont icon-downloadcenterx ${phone.showDial ? '' : 'call-busy-toggle_hide'}`} onClick={() => {
      dispatch({
        type: 'PHONE_SET',
        payload: {
          showDial: !phone.showDial
        }
      })
    }}></i> : null
    }
    {realArea ? <p className="call-busy-area">{realArea}</p> : null}

    {/* 【振铃-动画区】 */}
    <div className={`call-busy-avatar ${isRinging ? 'call-busy-avatar_ringing' : ''}`}>
      {[0, 1, 2].map((item) => <div key={item}></div>)}
      <i></i>
    </div>

    {/* 【通话-用户信息】 */}
    {
      callType === 'intercom' ?
        <p className="call-busy-name"></p> :
        callType === 'session' ?
          <>
            {username ? <p className="call-busy-name">{username}</p> : null}
            {vipLevel ? <i className={`call-busy-vip iconfont icon-vip${vipLevel}`}></i> : null}
            {callTransfer.type === 1 ? <p className="call-busy-tip">转接自 {callTransfer.transferFrom}</p> : null}
          </> :
          null
    }

    {/* 【通话-状态提示信息】 */}
    <p className="call-busy-tip">{phone.tip}</p>
    {callStatus === 'process' ? <p className="call-busy-count">在<span className="call-busy-count-number">{`${countDownNumber}s`}</span>后将自动进入下一则通话</p> : null}

    {/* 【通话操作】 */}
    {renderByCallStatus()}

    {/* 【外部通话：拨号盘】 */}
    <div className={`call-busy-dial call-busy-dial_${phone.showDial ? 'show' : 'hide'}`}>
      <input type="text" value={extNumber} readOnly={true} />
      <DialButtons className="buttons" handler={(button: string) => {
        setExtNumber(extNumber + button);
        sipAdaptor.callSDK('sendDigit', [button]);
      }}></DialButtons>
    </div>
  </div >
};

export default CallBusy;