import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import CallHeader from '@/pages/CallHeader';
import CallDial from '@/pages/CallDial';
import CallBusy from '@/pages/CallBusy';
import CallConference from '@/pages/CallConference';
import eventBus from '@/utils/eventBus';
import { sipAdaptor } from '@/utils/sip';
import { Modal, message } from 'ppfish';
import IntercomModal from '@/pages/SelectModal';
import { SessionType, ToggleTrigger, SessionStatus, callStatusMap, PhoneMode, seatStatusMap, PhoneStatus, TRestStatus, CallDirection, SessionMode } from '@/constant/phone';
import { get, iterateObject, sessionDebug, callPanelDebug, hidePhoneNumber, getType } from '@/utils';
import { notifyToolbar, preserveAutoAnswerSwitch, navigateToServingPage, showNotification, checkCallStatus, sdkSetStatusFailed } from '@/utils/phone';
import { getIVR } from '@/service/phone'
import { derivation } from '@/constant/outer';
import { audioRingSound, audioConnectSound } from '@/constant/element';
import useTimer from '@/hooks/timer';
import usePhone from '@/hooks/phone';
import { actionCallOut, actionCallTask, actionAddConferenceMember, actionToggle, actionJoin, actionHangup, actionCallOutFail, actionAccept, actionSetOutCallNumbers, actionSetMode, actionSetStatus } from '@/redux/actions/phone';
import useGlobal from '@/hooks/global';
import '@/style/CallPanel.less';
import globalVar from '@/globalVar';

const { user, callUser, isToolBar, hideCustomerNumber } = derivation;

preserveAutoAnswerSwitch(get(callUser, 'autoAnswerSwitch', 0));

const CallPanel: React.FC<Common.IObject<any>> = () => {
  const [, setNextAnswerTimer, clearNextAnswerTimer] = useTimer(null);
  const [, setInNextAnswerTimer, clearInNextAnswerTimer] = useTimer(null);
  const [currentSession, setCurrentSession] = useState<any>(null)
  const { phone } = usePhone();
  const { global } = useGlobal();
  const dispatch = useDispatch();


  interface ISetPhoneStatus {
    staffstatus: PhoneStatus,
    settedStatusExt: TRestStatus,
    settedStatus: PhoneStatus
  }
  const setPhoneStatus = ({ staffstatus, settedStatusExt, settedStatus }: ISetPhoneStatus, cached = true) => {
    const payload = {
      status: staffstatus,
      statusExt: settedStatusExt,
    }
    if (cached) {
      Object.assign(payload, {
        statusCached: staffstatus === PhoneStatus.process ? settedStatus : staffstatus
      })
    }
    dispatch({
      type: 'PHONE_SET',
      payload
    })
  }

  const countInNextAnswer = (counter: number) => {
    dispatch({
      type: 'PHONE_SET',
      payload: {
        inNextAnswerCounter: counter
      }
    })
    clearInNextAnswerTimer();
    setInNextAnswerTimer(setTimeout(() => {
      --counter;
      if (counter < 0) {
        clearInNextAnswerTimer();
        dispatch({
          type: 'PHONE_SET',
          payload: {
            inNextAnswer: false
          }
        })
      } else {
        countInNextAnswer(counter);
      }
    }, 1000));
  }

  const handleNextAnswer = (counter: number, duration: number) => {
    clearNextAnswerTimer();
    setNextAnswerTimer(setTimeout(() => {
      counter++;
      if (counter > duration || counter > 48) {
        clearNextAnswerTimer();
        dispatch({
          type: 'PHONE_SET',
          payload: {
            inNextAnswer: true
          }
        })
        countInNextAnswer(3);
      } else {
        handleNextAnswer(counter, duration);
      }
    }, 1000))
  }

  const checkSDKStatus = (status: [PhoneStatus, TRestStatus], restSwitch: boolean) => {
    let resultStatus = phone.status;
    let targetStatus = phone.status;
    let targetStatusExt = phone.statusExt;
    let errorMessage = '';

    if (getType(status) === 'array') {
      targetStatus = status[0];
      if (globalVar.validStatusOptions.some((validStatus) => validStatus.value === targetStatus)) {
        if (targetStatus === PhoneStatus.rest && restSwitch) {
          targetStatusExt = status[1];
          if (!globalVar.validRestStatusOptions.some((validRestStatus) => validRestStatus.value === targetStatusExt)) {
            errorMessage = '状态不在可选范围内';
          }
        } else {
          resultStatus = targetStatus;
        }
      } else {
        errorMessage = '状态不在可选范围内';
      }
    } else {
      errorMessage = '状态格式错误';
    }
    if (errorMessage) {
      // 通知工具条状态变更失败
      sdkSetStatusFailed(targetStatus, targetStatusExt, errorMessage);
    }
    return { value: resultStatus, errorMessage };
  }

  const handleRinging = (isConference = false) => {
    callPanelDebug("[ringing] callUser %O", callUser);
    dispatch(actionToggle(true) as any);
    const status = isConference ? 'joinIn' : 'callIn';
    dispatch({
      type: 'PHONE_SET',
      payload: isConference ? {
        callStatus: status,
        tip: '',
        conference: {
          tip: callStatusMap[status]
        }
      } : {
        callStatus: status,
        tip: callStatusMap[status],
      }
    });
    audioRingSound._play();
  }

  useEffect(() => {
    window.addEventListener('unload', () => {
      sipAdaptor.disconnect()
    })

    // 注册sipAdaptor事件回调
    iterateObject({
      // 媒体对象检测
      mediaError(options: Common.IObject<any>) {
        callPanelDebug("[mediaError] 浏览器WEBRTC模块出现内部错误 data %O callUser %O", options, callUser);
      },
      // 来电事件
      ringing(options: Common.IObject<any>) {
        const sessionType = options.type;

        if (![SessionType.empty, SessionType.callOut, SessionType.listener].includes(sessionType)) {
          clearTimeout(globalVar.resetAfterByeTimer)
        }

        if ([SessionType.callOut, SessionType.listener, SessionType.intercomOut].includes(sessionType)) {
          // 直接接听
          return sipAdaptor.accept();
        }

        // 振铃
        handleRinging(sessionType === SessionType.conference);
        globalVar.sessionType = sessionType;
        globalVar.sessionStatus = sessionType === SessionType.callIn ? SessionStatus.ring : SessionStatus.empty
      },
      // pc端唤起拨号
      call(options: Common.IObject<any>) {
        // 非空闲状态不处理
        if (phone.isBusy) return;

        // YSF-32256 呼叫工具条设置隐号且不能外呼的情况下, 面板不显示号码
        const isFromToolbar = options.source === 'toolbar'; // 是否是呼叫工具条触发此回调
        const canCallOut = phone.canCallOut || phone.status === PhoneStatus.hangup; // 可外呼状态

        const hideNumber = hideCustomerNumber && isFromToolbar && !canCallOut;

        dispatch({
          type: 'PHONE_SET',
          payload: {
            speakingNumber: hideNumber ? '' : options.number
          }
        })

        if (hideNumber) {
          message.error('电话功能初始化失败，请刷新或稍后重试!');
        }

        if (options.autocall && !hideNumber) {
          dispatch(actionCallOut() as any)
        }

        dispatch({
          type: 'PHONE_SET',
          payload: {
            display: true
          }
        })
      },
      // 提示用户重启浏览器
      warning() {
        dispatch({
          type: 'GLOBAL_SET',
          payload: {
            modalConfig: {
              visible: true,
              cancelButtonDisabled: true,
              children: '浏览器WEBRTC模块出现内部错误，请重启浏览器恢复',
              onOk() {
                dispatch({ type: 'GLOBAL_RESET', payload: { modalConfig: true } })
              }
            }
          }
        })
      },
      // 拨号中上报延迟信息
      jitterBuffer(options: any) {
        dispatch({
          type: 'PHONE_SET',
          payload: {
            jitterBuffer: options.jitterBuffer
          }
        })
      },
      failed(options: Common.IObject<any>) {
        if (globalVar.sessionStatus === SessionStatus.ring) {
          callPanelDebug("[onsessionend] data %O callUser %O", options, callUser);

          const { statusCached, statusExt } = phone;
          // 取通话前的暂存状态
          const statusPreset = statusCached === PhoneStatus.rest ? [statusCached, statusExt] : statusCached;

          dispatch(actionSetStatus({ value: statusPreset }))
          globalVar.sessionStatus = SessionStatus.empty;
          dispatch(actionHangup({
            staffstatus: statusCached
          }, 'session'))
          dispatch({
            type: 'PHONE_RESET',
            payload: {
              speakingNumberExt: true,
            }
          })
        }
        callPanelDebug('[failed] 会话错误 sessionStatus %O data %O callUser %O', globalVar.sessionStatus, options, callUser);
      },
      ended(options: Common.IObject<any>) {
        callPanelDebug('[ended] 会话结束 data %O callUser %O', options, callUser);
      },
      // 面板保持展开的开关初始化
      sdkInit(options: Common.IObject<any>) {
        globalVar.keepPanelUnfoldSwitch = get(options, 'data.keepPanelUnfoldSwitch', false);
        callPanelDebug('[toolbar] emit sdkInit options %O ', options);
      },
      sdkSetStatus(options: Common.IObject<any>) {
        // 通过工具条改变坐席服务状态
        const checkResult = checkSDKStatus(options.value, callUser.restStatusSwitch);
        const { value, errorMessage } = checkResult;
        if (!errorMessage) {
          dispatch(actionSetStatus({ value }))
        } else {
          // 状态有误，请确保设置可用状态
          if (get(options, 'options.toastSwitch', false)) message.error(errorMessage);
        }
        callPanelDebug('[toolbar] emit setstatus checked  %O ', checkResult);
      },
      // 控制面板展开或收起
      sdkToggle(options: Common.IObject<any>) {
        callPanelDebug('[toolbar] emit toggle options %O ', options);
        dispatch(actionToggle(options.flag, false, { trigger: ToggleTrigger.sdk, force: true }));
      },
      // 面板保持展开的开关
      sdkKeepPanelUnflod(options: Common.IObject<any>) {
        callPanelDebug('[toolbar] emit keepPanelUnflod options %O ', options);
        const { onoff = false, now = false } = options.data || {};
        globalVar.keepPanelUnfoldSwitch = onoff;
        if (now) {
          dispatch(actionToggle(onoff, false, { trigger: ToggleTrigger.sdk }));
        }
      },
    }, (handler, event) => {
      sipAdaptor.addEventListener(event, handler)
    })

    // 注册应用消息回调
    iterateObject({
      onrandomupdate(options: {
        outcallRandom: boolean
      }) {
        const { outcallRandom: outCallRandom } = options;
        dispatch({
          type: 'PHONE_SET',
          payload: {
            outCallRandom
          }
        })
        if (!outCallRandom) dispatch(actionSetOutCallNumbers(outCallRandom))
      },
      onmonitorsucc() {
        if ([PhoneStatus.webOnline, PhoneStatus.sipOnline].includes(phone.status)) {
          message.success('发起监听后，呼叫状态将默认切换为挂起');
          dispatch(actionSetStatus({ value: PhoneStatus.hangup }))
        }
      },
      onredirectupdate(options: {
        mode: PhoneMode
      }) {
        dispatch(actionSetMode(options.mode));
      },
      ondetailload(options: {
        session: {
          mobile: string,
          mobileArea: string,
          user: {
            realname: string
          },
          vipLevel: number
        }
      }) {
        const { mobile: speakingNumber, mobileArea, user, vipLevel } = options.session
        dispatch({
          type: 'PHONE_SET',
          payload: {
            speakingNumber,
            session: {
              mobileArea,
              username: get(user, 'realname', ''),
              vipLevel
            }
          }
        })
      },
      onforeignload(options: {
        origin: any[]
      }) {
        options.origin.forEach(item => {
          if (get(item, 'map', '') === 'real_name') {
            dispatch({
              type: 'PHONE_SET',
              payload: {
                session: {
                  username: item.value
                }
              }
            })
          }
        })
      },
      oncalltask(options: {
        origin: any[]
      }) {
        const checkResult = checkCallStatus({
          hasInit: sipAdaptor.status.tip,
          canCallOut: '电话服务需为在线或者挂起状态，才可外呼客户',
          isBusy: '当前正在通话，不允许外呼'
        }, phone);
        if (checkResult) {
          return message.error(checkResult)
        }

        if (!phone.outCallRandom) {
          let selectedOutCallNumber = '';
          const { outCallNumbers, outCallNumber } = phone;
          if (outCallNumbers.length > 1) {
            selectedOutCallNumber = outCallNumber
          } else if (outCallNumbers.length === 1) {
            selectedOutCallNumber = outCallNumbers[0];
          }
          if (!selectedOutCallNumber) return message.error('请先选择外呼号码');
          dispatch({
            type: 'PHONE_SET',
            payload: {
              outCallNumber: selectedOutCallNumber
            }
          })
        }

        const dialingNumber = get(options, 'params.phone', '');
        const realDialingNumber = hideCustomerNumber ? hidePhoneNumber(dialingNumber) : dialingNumber;

        dispatch({
          type: 'GLOBAL_SET',
          payload: {
            modalConfig: {
              visible: true,
              cancelButtonDisabled: true,
              children: `确定呼出${realDialingNumber}吗?`,
              onOk() {
                dispatch(actionCallTask(options) as any);
                dispatch({ type: 'GLOBAL_RESET', payload: { modalConfig: true } })
              }
            }
          }
        })
      },
      ondisconnect: sipAdaptor.disconnect,
      onkickout() {
        dispatch({
          type: 'PHONE_SET',
          payload: {
            session: {
              kickedOut: true
            }
          }
        })
      },
      onconnect() {
        if (callUser.mode !== PhoneMode.soft) return;
        sipAdaptor.connect(true, {
          from: '云信',
          status: phone.status,
          preset: -1,
        })
      },
      changeStatusTimeout() {
        dispatch({
          type: 'PHONE_SET',
          payload: {
            statusSelectDisabled: false
          }
        })
      }
    }, (handler, event) => {

    })

    // 注册ws消息回调
    iterateObject({
      // 
      '56': {
        handler(options: {
          type: number,
          notice: {
            phone: string,
            id: string
          }
        }) {
          // const { type, notice } = options;
          // const handlerMap = {
          //   1: (notice) => {

          //   },
          //   3: (notice) => {

          //   }
          // }
          // const handler = handlerMap[type];
          // if (handler) handler(notice)
        }
      },
      // 【电话会话】开始
      '130': {
        async handle(options: {
          mode: PhoneMode,
          staffstatus: PhoneStatus,
          usernumber: string,
          sessionid: number,
          address?: string,
          username?: string,
          viplevel: string,
          callTransfer: any,
          direction: CallDirection,
          autoAnswerSwitch: 0 | 1,
          duration: number,
          nextAnswerDuration: number,
          staffnumber?: string
        }) {
          sessionDebug('130   %O', options);
          // 手机在线时，不处理130事件
          if (options.mode === PhoneMode.phone) return;

          callPanelDebug('[onsessionbegin] data %O callUser %O', options, callUser);
          const isSoftIN = options.mode === PhoneMode.soft && options.direction === CallDirection.in;
          // 软电话模式下，是否有有效会话
          if (!sipAdaptor.getSession() && isSoftIN) {
            callPanelDebug("[onsessionbegin] web session has failed");
            return;
          }

          const { usernumber: speakingNumber, sessionid: sessionId } = options;
          const mobileArea = get(options, 'address', '');
          const username = get(options, 'username', '');
          dispatch({
            type: 'PHONE_SET',
            payload: {
              sessionMode: SessionMode.empty,
              status: options.staffstatus,
              speakingNumber,
              session: {
                sessionId,
                mobileArea,
                username,
                vipLevel: options.viplevel,
                callTransfer: options.callTransfer
              }
            }
          })

          // cc5.15 自动接起功能
          if (isSoftIN && options.autoAnswerSwitch) {
            clearTimeout(globalVar.autoAnswerTimer);
            globalVar.autoAnswerTimer = setTimeout(() => {
              dispatch(actionAccept({
                autoAnswer: true
              }))
            }, options.duration * 1000)
          }
          // cc5.15 顺振功能
          if (isSoftIN && options.nextAnswerDuration) {
            // 从nextAnswerDuration-2开始进入顺振中倒计时
            handleNextAnswer(0, options.nextAnswerDuration - 2);
          }

          // sip话机进线，显示来电弹屏
          if (options.mode === PhoneMode.sip && phone.callStatus === 'callOut') { handleRinging() } else if (isSoftIN) {
            globalVar.sessionStatus = SessionStatus.begin;
          }

          if (isToolBar) {
            const sessionData = {
              address: mobileArea,
              usernumber: speakingNumber,
              sessionid: sessionId,
              staffnumber: get(options, 'staffnumber', ''),
              staffid: user.id,
              ivrPathName: null,  // 默认或出错则传空
              staffname: user.username,
              direction: options.direction
            };
            const ivrPathName = await getIVR(sessionId);
            Object.assign(sessionData, {
              ivrPathName
            })
            notifyToolbar({
              cmd: 'session',
              data: sessionData
            })
          }

          setCurrentSession(options);

          if (window.cefQuery && options.direction !== CallDirection.out) {
            showNotification('callSession', options);
            navigateToServingPage(sessionId);
            return;
          }

          if (document.hidden && options.direction !== CallDirection.out) {
            const notificationType = get(options, 'callTransfer.type', 0) === 1 ? 'callTransfer' : 'callSession';
            showNotification(notificationType, options);
          }
          if (!isToolBar) navigateToServingPage(sessionId);
        }
      },
      // 【电话会话】结束
      '131': {
        handle(options: {
          sessionid: number,
          staffstatus: PhoneStatus,
          settedStatusExt: TRestStatus,
          direction: CallDirection,
          reason: number,
          settedStatus: PhoneStatus
        }) {
          sessionDebug('131   %O', options);
          if (!currentSession && callUser.status !== PhoneStatus.calling || options.sessionid !== get(currentSession, 'sessionid', '')) {
            sessionDebug('131 return; old:%O; new:%O', currentSession, options);
            return;
          }

          setCurrentSession(null);

          clearNextAnswerTimer();
          clearTimeout(globalVar.autoAnswerTimer);
          callPanelDebug("[onsessionclose] data %O callUser %O", options, callUser);
          setPhoneStatus(options);

          if (options.direction === CallDirection.out) {
            if (options.reason === 2) dispatch(actionCallOutFail('用户线路忙') as any)
            else if (options.reason === 1) dispatch(actionCallOutFail('呼叫失败') as any)
            else {
              dispatch(actionHangup(options, 'session') as any);
            }
          } else {
            dispatch(actionHangup(options, 'session') as any);
            globalVar.sessionStatus = SessionStatus.close;
          }

          dispatch({
            type: 'PHONE_RESET',
            payload: {
              showDial: true,
              speakingNumberExt: true
            }
          })

          notifyToolbar({
            cmd: 'sessionClose',
            data: {
              address: phone.session.mobileArea,
              usernumber: phone.speakingNumber,
              sessionid: phone.session.sessionId,
              staffid: user.id,
              staffname: user.username
            }
          })
        }
      },
      // 【电话会话】外呼对方接起
      '132': {
        handle(options: Common.IObject<any>) {
          sessionDebug('accepted   %O', options);
          callPanelDebug("[accepted callout] data %O callUser %O", options, callUser);
          dispatch(actionToggle(false, true) as any);
          const callStatus = 'speaking'
          dispatch(
            {
              type: 'PHONE_SET',
              payload: {
                callStatus,
                tip: callStatusMap[callStatus]
              }
            }
          );
          audioConnectSound && audioConnectSound._play();
        }
      },
      // sip话机接起
      '173': {
        handle(options: Common.IObject<any>) {
          sessionDebug('onsipaccepted  %O', options);
          dispatch(actionAccept({
            options
          }))
        }
      },
      // 180-199留给电话会议使用
      // 【会议】电话会议开始
      '180': {
        handle(options: {
          sessionId: string,
          conferenceId: string,
          time: number
        }) {
          sessionDebug('onconferencebegin  %O', options);
          dispatch({
            type: 'PHONE_SET',
            payload: {
              callStatus: 'conference',
              conference: {
                sessionId: options.sessionId,
                conferenceId: options.conferenceId,
              }
            }
          })
        }
      },
      // 【会议】电话会议结束
      '181': {
        handle(options: {
          sessionId: string,
          conferenceId: string,
          time: number
        }) {
          sessionDebug('onconferenceend  %O', options);
        }
      },
      // 【会议】邀请成员加入，被邀请者收到
      '182': {
        handle(options: {
          sessionId: string,
          conferenceId: string,
          chairman: string,
          chairmanName: string,
          time: number,
          staffstatus: PhoneStatus,
        }) {
          sessionDebug('onconferencejoin  %O', options);
          dispatch({
            type: 'PHONE_SET',
            payload: {
              status: options.staffstatus,
              conference: {
                chairmanId: options.chairman,
                chairmanName: options.chairmanName
              }
            }
          })
          // 如果是sip话机进线，显示来电弹屏，同会话开始
          if (callUser.mode === PhoneMode.sip) { handleRinging(true); }
          // TODO 桌面应用内或者桌面应用后台运行时
        }
      },
      // 【会议】成员加入
      '183': {
        handle(options: {
          sessionId: string,
          conferenceId: string,
          isChairman: boolean,
          member: string,
          memberName: string,
          time: number
        }) {
          sessionDebug('onconferencejoined  %O', options);
          callPanelDebug('[conferenceJoined] members:%O', phone.conference);
          dispatch(actionAddConferenceMember(options, 1) as any)
          if (callUser.mode === PhoneMode.sip) {
            dispatch(actionJoin(PhoneMode.sip))
          }
        }
      },
      // 【会议】成员离开
      '184': {
        handle(options: {
          sessionId: string,
          conferenceId: string,
          isChairman: boolean,
          member: string,
          time: number,
          staffstatus: PhoneStatus,
          settedStatusExt: TRestStatus,
          settedStatus: PhoneStatus
        }) {
          sessionDebug('onconferenceleft  %O', options);
          const isUserLeft = get(user, 'id', 0) === options.member;
          if (isUserLeft) {
            dispatch(actionHangup(options) as any);
            if (options.isChairman) {
              // 本人离开且本人是主持人，清空成员并挂机
              if (phone.isBusy) {
                setPhoneStatus(options)
              }
              dispatch({
                type: 'PHONE_RESET',
                payload: {
                  conference: true
                }
              })
            } else {
              // 本人离开且本人不是主持人，直接挂机
              setPhoneStatus(options, false)
            }
          } else {
            // 成员离开，踢出成员
            const members = { ...get(phone, 'conference.members', {}) };
            delete members[options.member];
            dispatch({
              type: 'PHONE_SET',
              payload: {
                conference: {
                  members
                }
              }
            })
          }
        }
      },
      // 【会议】成员被禁言
      '185': {
        handle(options: {
          sessionId: string,
          conferenceId: string,
          isChairman: boolean,
          member: string,
          time: number
        }) {
          const payload = {};
          if (options.isChairman) {
            const members = get(phone, 'conference.members', {})
            const realMembers = {
              ...members,
              [options.member]: {
                ...members[options.member],
                mute: 1
              }
            };
            Object.assign(payload, {
              conference: {
                members: realMembers
              }
            })
          } else {
            Object.assign(payload, {
              tip: '禁言中'
            })
          }
          dispatch({
            type: 'PHONE_SET',
            payload
          })
        }
      },
      // 【会议】成员被取消禁言
      '186': {
        handle(options: {
          sessionId: string,
          conferenceId: string,
          isChairman: boolean,
          member: string,
          time: number
        }) {
          const payload = {};
          if (options.isChairman) {
            Object.assign(payload, {
              conference: {
                members: {
                  [options.member]: {
                    mute: 0
                  }
                }
              }
            })
          } else {
            Object.assign(payload, {
              tip: callStatusMap.speaking
            })
          }
          dispatch({
            type: 'PHONE_SET',
            payload
          })
        }
      },
      // 【通话】电话音频识别内容推送
      '2000': {
        handle(options: {
          sessionid: string,
          userType: string,
          userId: string,
          text: string,
          time: number,
          firetime: number
        }) {
          sessionDebug('onsessionaudioasr   %O', options);
          callPanelDebug('[onsessionaudioasr] data %O callUser %O', options, callUser);

          notifyToolbar({
            cmd: 'sessionAudioASR',
            data: {
              "sessionid": options.sessionid,
              "userType": options.userType,
              "userId": options.userId,
              "text": options.text,
              "time": options.time,
            }
          })
        }
      },
      // 【内部通话】内部通话创建
      '2001': {
        handle(options: {
          direction: number,
          callerName: string,
          callerStaffId: string,
          calleeName: string,
          calleeStaffId: string,
          intercomId: string,
          staffStatus: PhoneStatus,
          mode: PhoneMode
        }) {
          sessionDebug('onintercombegin   %O', options);

          const isCaller = options.direction !== CallDirection.in;
          const payload = {
            intercom: isCaller ? {
              intercomId: options.intercomId,
              remoteStaffName: options.calleeName,
              remoteStaffId: options.calleeStaffId,
              intercomFlag: '呼叫客服'
            } : {
              intercomId: options.intercomId,
              remoteStaffName: options.callerName,
              remoteStaffId: options.callerStaffId,
              intercomFlag: '企业内部通话'
            }
          };

          callPanelDebug('[onintercombegin] data %O callUser %O', options, callUser);

          Object.assign(payload, {
            sessionMode: SessionMode.intercom,
            isCaller,
            status: options.staffStatus
          })
          dispatch({
            type: 'PHONE_SET',
            payload
          })

          if (options.mode === PhoneMode.sip && phone.callStatus !== 'callOut') handleRinging();

          const { intercomId, remoteStaffId, remoteStaffName } = payload.intercom;
          notifyToolbar({
            cmd: 'intercomSession',
            data: {
              intercomid: intercomId,
              remotestaffid: remoteStaffId,
              remotestaffname: remoteStaffName,
              direction: options.direction
            }
          });
        }
      },
      // 【内部通话】内部通话挂断
      '2002': {
        handle(options: {
          direction: number,
          staffstatus: PhoneStatus,
          settedStatusExt: TRestStatus,
          settedStatus: PhoneStatus,
          intercomId: string,
          reason: number
        }) {
          sessionDebug('onintercomclose   %O', options);
          callPanelDebug("[onintercomclose] data %O callUser %O", options, callUser);
          setPhoneStatus(options);
          const failMap: Common.IObject<Function> = {
            '1'() {
              dispatch(actionCallOutFail('呼叫失败') as any)
            },
            '2'() {
              dispatch(actionCallOutFail('用户线路忙') as any)
            },
            default() {
              dispatch(actionHangup(options, 'intercom') as any);
            }
          }
          let handler = failMap.default;
          if (options.direction === CallDirection.out) {
            handler = failMap[String(options.reason)] || failMap.default;
          }
          handler()

          dispatch({
            type: 'PHONE_RESET',
            payload: {
              showDial: true,
              speakingNumberExt: true
            }
          })

          notifyToolbar({
            cmd: 'intercomSessionClose',
            data: {
              intercomid: options.intercomId,
              direction: options.direction
            }
          });
        },
      },
      // 【内部通话】内部通话接起
      '2003': {
        handle(options: {
          intercomId: string,
          calleeStaffId: number
        }) {
          sessionDebug('onintercombegin   %O', options);
          callPanelDebug('[onIntercomaccepted callout] data %O callUser %O', options, callUser);

          dispatch(actionToggle(false, true));
          const callStatus = 'speaking';
          dispatch({
            type: 'PHONE_SET',
            payload: {
              callStatus,
              tip: callStatusMap[callStatus]
            }
          })
          audioConnectSound && audioConnectSound.play();
        }
      },
      // 通知坐席管理员切换自动接起开关状态
      '2004': {
        handle(options: {
          autoAnswerSwitch: 0 | 1,
        }) {
          sessionDebug('onautoanswerswitch  %O', options);

          if (phone.mode !== PhoneMode.soft) return;

          const autoAnswerSwitch = get(options, 'autoAnswerSwitch', 0);
          const isCalling = [PhoneStatus.webOnline, PhoneStatus.process, PhoneStatus.calling].includes(get(callUser, status, 0));
          const isAutoAnswerFirstTips = !(autoAnswerSwitch && isCalling);
          dispatch({
            type: 'PHONE_SET',
            payload: {
              isAutoAnswerFirstTips
            }
          })
          if (!isAutoAnswerFirstTips) {
            message.warning('管理员已开启自动接起模式，下一个呼入通话将被自动接起', 5000);
          }
          preserveAutoAnswerSwitch(autoAnswerSwitch)
        }
      },
    }, (handler, event) => {
      eventBus.addEventListener(event, handler.handle)
    })

    // 软电话模式下，初始化sip账号
    if (phone.mode === PhoneMode.soft) {
      sipAdaptor.init();
    }
  }, [])

  const toggleDisplay = (display?: boolean) => {
    dispatch({
      type: 'PHONE_SET',
      payload: {
        display: display !== undefined ? display : !phone.display
      }
    })
  }

  const currentStatus = seatStatusMap[phone.status];

  const getMain = () => {
    if (phone.callStatus === 'conference') return <CallConference />;
    if (phone.isBusy) return <CallBusy></CallBusy>
    return <CallDial></CallDial>
  }

  return <div className="call-panel">
    <div className="call-panel-title" onClick={() => {
      toggleDisplay()
    }}>
      <i className={`iconfont icon-${currentStatus.icon}`} style={{ color: currentStatus.color }}></i>
      <p>{currentStatus.text}</p>
    </div>
    <p className={`call-panel-toggle ${phone.toggleTipDisplay ? '' : 'call-panel-toggle_close'}`} onClick={() => {
      toggleDisplay(true)
    }}>点击可展开通话面板</p>
    <div className={`call-panel-main ${phone.display ? '' : 'call-panel-main_close'}`}>
      <CallHeader></CallHeader>
      {getMain()}
      <Modal {...global.modalConfig}>
        {global.modalConfig.children}
      </Modal>
      <IntercomModal />
    </div>
  </div>
};

export default CallPanel;
