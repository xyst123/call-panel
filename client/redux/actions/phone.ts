import { IExtendedPhone, SessionType, SessionStatus, SessionMode, callStatusMap, seatStatusMap, PhoneStatus, restStatusMap, TRestStatus, ToggleTrigger, PhoneMode, memberInitial } from '@/constant/phone';
import { derivation } from '@/constant/outer';
import store from '@/redux/store';
import { handleRes, get, callPanelDebug, setStorage, getType } from '@/utils';
import { notifyToolbar, checkCallStatus, sdkSetStatusFailed, sendMessage } from '@/utils/phone';
import { sipAdaptor } from '@/utils/sip';
import { audioHangupSound, audioRingSound } from '@/constant/element';
import { enhancePhone } from '@/hooks/phone';
import { callOut, intercomCallOut, setStatus, joinConference, transfer, intercomMute, getOutCallNumbers } from '@/service/phone';
import eventBus from '@/utils/eventBus';
import globalVar from '@/globalVar';
import { message } from 'ppfish';

const { callUser, isToolBar } = derivation;
const { getState } = store;

const getPhone = () => enhancePhone(getState().phone);

const getStatusText = (key: PhoneStatus, subKey: TRestStatus) => {
  if (key === PhoneStatus.rest && subKey) {
    return `${seatStatusMap[key]}-${restStatusMap[subKey]}`
  }
  return seatStatusMap[key];
}

const showSecurityBookModal = () => (dispatch: Store.dispatch) => {
  dispatch({
    type: 'GLOBAL_SET',
    payload: {
      modalConfig: {
        visible: true,
        cancelButtonDisabled: true,
        title: '警告：信息安全承诺书未签署',
        children: '请联系超级管理员登录七鱼系统阅读并签署《信息安全承诺书》，承诺书未签署前，应用中的呼叫功能无法使用。签署路径：超级管理员在管理员模式下进入呼叫应用，系统会弹出《信息安全承诺书》签署页面。',
        onOk() {
          dispatch({ type: 'GLOBAL_RESET', payload: { modalConfig: true } })
        }
      }
    }
  })
}

interface ICallOutRequest {
  dialNumber: string,
  outCallNumber: string,
  callback?: Function
}
const callOutRequest = ({ dialNumber, outCallNumber, callback = Function.prototype }: ICallOutRequest) => async (dispatch: Store.dispatch) => {
  const res = await callOut(dialNumber, outCallNumber);
  handleRes(res, callback, () => {
    let phone = getPhone();
    // 如果刚好有进线，那么不处理外呼失败提示
    if ((phone.isBusy && phone.callStatus !== 'callOut')) return true;
    switch (res.code) {
      case 8150:
        message.error(res.msg)
        break;
      case 4000:
        message.error(res.msg)
        dispatch(showSecurityBookModal() as any);
        break;
    }
    dispatch({
      type: 'PHONE_SET',
      payload: {
        callStatus: 'callOutFail',
        tip: res.msg
      }
    })

    // TODO 通知页面头部
    // this.__session.__emit('oncalloutfaile');
  })
}

export const actionCallOut = (options?: Common.IObject<any>) => async (dispatch: Store.dispatch) => {
  let phone = getPhone();
  const checkResult = checkCallStatus({
    hasInit: sipAdaptor.status.tip,
    canCallOut: '电话服务需为在线或者挂起状态，才可外呼客户',
    isBusy: '当前正在通话，不允许外呼'
  }, phone);
  if (checkResult) return message.error(checkResult)

  const realDialNumber = get(options, 'phone', phone.dialingNumber).trim();
  if (!realDialNumber) return message.error('电话号码不正确，请重新输入');

  dispatch({
    type: 'PHONE_SET',
    payload: {
      sessionMode: SessionMode.empty
    }
  })
  phone = getPhone();

  const outCallNumber = phone.outCallRandom ? '' : phone.outCallNumber;

  if (!phone.outCallRandom && !outCallNumber) return message.error('请选择外呼号码');

  clearTimeout(globalVar.autoAnswerTimer);

  callPanelDebug(`[sendCallOut] number: ${phone.outCallNumber}`);

  const callStatus = 'callOut'
  dispatch({
    type: 'PHONE_SET',
    payload: {
      display: options ? true : phone.display,
      speakingNumber: realDialNumber,
      callStatus,
      tip: callStatusMap[callStatus]
    }
  })

  dispatch(callOutRequest({
    dialNumber: realDialNumber, outCallNumber, callback: get(options, 'cb', Function.prototype)
  }) as any)
}

export const actionIntercomCallOut = () => async (dispatch: Store.dispatch) => {
  let phone = getPhone();

  const checkResult = checkCallStatus({
    canCallOut: '电话服务需为在线或者挂起状态，才能内部呼叫'
  }, phone)
  if (checkResult) return message.error(checkResult);

  callPanelDebug('[sendIntercomCallout]  staffId:%s', phone.intercom.remoteStaffId);

  dispatch({
    type: 'PHONE_SET',
    payload: {
      sessionMode: SessionMode.intercom,
      callStatus: 'callOut',
      speakingNumber: phone.dialingNumber.trim(),
      tip: callStatusMap.callOut
    }
  })

  phone = getPhone();

  const res = await intercomCallOut(phone.intercom.remoteStaffId);
  handleRes(res, Function.prototype, () => {
    // 如果刚好有进线，那么不处理外呼失败提示
    if ((phone.isBusy && phone.callStatus !== 'callOut')) return true;
    switch (res.code) {
      case 8150:
        message.error(res.msg)
        break;
      case 4000:
        dispatch(showSecurityBookModal() as any);
        break;
    }
    dispatch({
      type: 'PHONE_SET',
      payload: {
        callStatus: 'callOutFail',
        tip: res.msg
      }
    })
    phone = getPhone();

    // TODO 通知页面头部
    // me.__session.__emit('oncalloutfaile')
  })
}

export const actionCallTask = (callTaskData: any) => async (dispatch: Store.dispatch) => {
  const { phone: dialNumber, did: outCallNumber } = callTaskData.param;
  const callStatus = 'callOut'
  dispatch({
    type: 'PHONE_SET',
    payload: {
      display: true,
      callTaskData,
      speakingNumber: dialNumber,
      callStatus,
      tip: callStatusMap[callStatus],
    }
  })
  dispatch(callOutRequest({
    dialNumber, outCallNumber
  }) as any)
}

interface IHandleSetStatus {
  seatStatus: PhoneStatus,
  restStatus: TRestStatus,
  type: string,
  confirmCallback?: (options: boolean) => void
}

const handleSetStatus = (options: IHandleSetStatus) => async (dispatch: Store.dispatch) => {
  const { seatStatus, restStatus, type, confirmCallback } = options
  const status = seatStatus;
  const statusExt = restStatus ? restStatus : undefined;
  const data = { status, statusExt };
  const statusText = seatStatus === PhoneStatus.rest ? '小休' : '挂起';

  // 禁用状态选择下拉框
  dispatch({
    type: 'PHONE_SET',
    payload: {
      statusSelectDisabled: true
    }
  })

  sendMessage('changecallstatus');

  callPanelDebug('[sendStatus]  status:%s', getStatusText(seatStatus, restStatus));
  let phone = getPhone();

  const res = await setStatus(type, data);
  handleRes(res, () => {
    const payload: Common.IObject<any> = {
      statusSelectDisabled: false,
      status: seatStatus,
      statusExt: restStatus,
    }

    confirmCallback && confirmCallback(true);

    // TODO clearTiming
    // me.clearTiming(); // 清空完成处理倒计时

    if (phone.mode === PhoneMode.soft) {
      if (!phone.isBusy) {
        Object.assign(payload, {
          statusCached: seatStatus
        })
      }

      // 呼入自动接起开关开启时，切在线状态前给予提示
      const autoAnswerEnable = ['1', 'true'].includes(window.sessionStorage.getItem('YSF-CALL-AUTOANSWER') as string);
      if (
        seatStatus === 1 &&
        phone.isAutoAnswerFirstTips &&
        autoAnswerEnable
      ) {
        Object.assign(payload, {
          isAutoAnswerFirstTips: false
        })
        message.warning('管理员已开启自动接起模式，呼入通话将被自动接起', 5000);
      }
    }

    if (phone.callStatus === 'process') {
      // 在接起下一通的情况下，切换状态后，面板恢复
      Object.assign(payload, {
        callStatus: 'empty',
        dialingNumber: '',
        speakingNumber: '',
        sessionMode: SessionMode.empty,
        session: {
          mobileArea: ''
        }
      })
    }

    // 软电话模式下，如果离线成功，断开呼叫服务
    if (seatStatus === 0 && phone.mode === PhoneMode.soft && phone.isBusy) sipAdaptor.disconnect();

    // 统一 dispatch
    dispatch({
      type: 'PHONE_SET',
      payload
    })
  }, () => {
    const payload: Common.IObject<any> = {
      statusSelectDisabled: false,
    }
    confirmCallback && confirmCallback(false);

    let errorMessage = ''
    const onCancel = () => {
      dispatch({ type: 'GLOBAL_RESET', payload: { modalConfig: true } })
    }
    switch (res.code) {
      case 8150:
        errorMessage = `电话功能被禁用`;
        dispatch({
          type: 'GLOBAL_SET',
          payload: {
            modalConfig: {
              visible: true,
              cancelButtonDisabled: true,
              children: '电话功能被禁用',
              onOk() {
                onCancel();
                window.location.reload();
              },
              onCancel
            }
          }
        })
        break;
      case 4000:
        errorMessage = '信息安全承诺书未签署';
        dispatch(showSecurityBookModal() as any);
        break;
      case 40001:
        errorMessage = `你的今日${statusText}已达上限`;
        message.error(errorMessage)
        break;
      case 40002:
        errorMessage = `你已触达${statusText}限制条件，请在呼叫系统导航点击 '提交申请'，等待管理员审批`;
        message.error(errorMessage, 5000)
        break;
      case 40003:
        errorMessage = `你有尚未完结的${statusText}申请，请勿重复提交`;
        message.error(errorMessage)
        break;
      case 40004:
        errorMessage = `请按申请内容，切换至 ${getStatusText(seatStatus, restStatus)}`;
        message.warning(errorMessage)
        break;
      default:
        errorMessage = res.msg;
        message.error(errorMessage)
    }

    // 统一 dispatch
    dispatch({
      type: 'PHONE_SET',
      payload
    })

    // 通知工具条状态变更失败
    sendMessage('changecallstatusfailed')
    sdkSetStatusFailed(status, statusExt!, errorMessage);
  })

  // TODO onstatusload
  // this.__emit('onstatusload', {
  //   options: data,
  //   result: res.data
  // });
}

export const actionSetStatus = (options: Common.IObject<any>) => (dispatch: Store.dispatch) => {
  let phone = getPhone();
  if (phone.kickedOut) {
    const status = get(callUser, 'status', 0);
    if (options.value || status) {
      options.value = PhoneStatus.offline;
    }
    callPanelDebug(`[sendStatus] ${seatStatusMap[status].kickedText || '账号被踢'}`);
  }

  const { mockManualSwitch, confirmCallback, value, type } = options;
  // auto为true表示自动发起的切换；为false表示是用户手动切换
  const autoSwitch = mockManualSwitch ? !mockManualSwitch : !confirmCallback;
  const [seatStatus, restStatus] = Array.isArray(value) ? value : [value, ''];

  callPanelDebug(
    '[changeStatus]  status:%s mode:%d',
    getStatusText(seatStatus, restStatus),
    phone.mode
  );

  // 用户手动切换状态时，状态切换
  // 开启小休细分&切换小休时，检测二级状态是否相同; 其他情况只检测一级状态是否相同
  if (phone.status === PhoneStatus.rest && phone.restStatusSwitch) {
    if (
      seatStatus === phone.status &&
      restStatus === phone.statusExt &&
      !autoSwitch
    ) return;
  } else {
    if (seatStatus === phone.status && !autoSwitch) return;
  }

  const setStatus = (options: IHandleSetStatus) => {
    dispatch(handleSetStatus.call(null, options) as any)
  }
  // 切换为离线，直接返回
  if (seatStatus === 0) return setStatus({ seatStatus, restStatus, type, confirmCallback });
  // sip话机和手机在线模式，直接切换状态
  if (phone.mode !== PhoneMode.soft) return setStatus({ seatStatus, restStatus, type, confirmCallback });
  // sdk初始化成功，直接切换状态
  if (sipAdaptor.status.code === 0) return setStatus({ seatStatus, restStatus, type, confirmCallback });
  const handleSIPError = () => {
    sdkSetStatusFailed(seatStatus, restStatus, sipAdaptor.status.tip)
    if (confirmCallback) {
      confirmCallback(false)
    }
    message.error(sipAdaptor.status.tip);
  }
  // 如果不是初始化失败或进行中，直接返回相应提示
  if (sipAdaptor.status.code !== 2) {
    return handleSIPError()
  }
  // 如果确实是sdk初始化失败了（sipAdaptor.status.code === 2），重连一次，1s后再判断是否初始化成功
  sipAdaptor.connect(!autoSwitch, {
    from: '面板状态',
    status: phone.status,
    preset: seatStatus,
  });
  setTimeout(() => {
    if (sipAdaptor.status.code !== 0) {
      return handleSIPError()
    }
    setStatus({ seatStatus, restStatus, type, confirmCallback });
  }, 1000);
}

// 【会议】成员加入会议
export const actionAddConferenceMember = (options: Common.IObject<any>,
  state: number) => (dispatch: Store.dispatch) => {
    const phone = getPhone();
    const { conference } = phone;
    const existMember = conference.members[options.member] || { ...memberInitial }

    Object.assign(existMember, {
      id: options.member,
      name: options.memberName,
      isChairman: options.isChairman || false,
      conferenceId: options.conferenceId || 0,
      time: options.time,
      state
    })

    const conferencePayload = {
      members: {
        ...conference.members,
        [existMember.id]: existMember
      }
    }
    if (existMember.isChairman) {
      Object.assign(conferencePayload, {
        chairmanId: existMember.id,
        chairmanName: existMember.name
      })
    }

    dispatch({
      type: 'PHONE_SET',
      payload: {
        conference: conferencePayload
      }
    })
  }

export const actionStartConference = (type: string,
  data: Common.IObject<any> = {}) => async (dispatch: Store.dispatch) => {
    callPanelDebug(`[${type}] data:%O`, data);

    const phone = getPhone();
    const { outCallRandom, outCallNumber, outCallNumbers, session } = phone;

    const { name: memberName } = data;
    delete data.name;
    const realData = {
      ...data,
      sid: session.sessionId
    }

    // 主持坐席使用号码
    if (!outCallRandom) {
      let selectedOutCallNumber = '';
      if (outCallNumbers.length > 1) {
        selectedOutCallNumber = outCallNumber;
      } else if (outCallNumbers.length === 1) {
        selectedOutCallNumber = outCallNumbers[0];
      }
      if (!selectedOutCallNumber) return message.error('请选择外呼号码');
      Object.assign(realData, {
        did: selectedOutCallNumber
      })
    }

    // 清空上次多方会话信息
    if (type === 'conference') {
      dispatch({
        type: 'PHONE_RESET',
        payload: {
          conference: true
        }
      })
    }

    const res = await joinConference(type, realData);
    handleRes(res, (json: Common.IObject<any>) => {
      dispatch(actionAddConferenceMember({
        ...json,
        memberName,
        time: (json.time || Date.now()) + 60 * 1000
      }, 0) as any);
    }, () => true)
  }

// @ts-ignore
let toggleTipDisplayTimer: NodeJS.Timeout = -1;

const setToggleTipDisplay = (toggleTipDisplay: boolean) => (dispatch: Store.dispatch) => {
  dispatch({
    type: 'PHONE_SET',
    payload: {
      toggleTipDisplay
    }
  })
}

// 展示收起呼叫面板
export const actionToggle = (display?: boolean, showFoldTip = false, options: Common.IObject<any> = {}) => (dispatch: Store.dispatch) => {
  const phone = getPhone();
  let realDisplay = display;
  if (display === undefined) {
    realDisplay = !phone.display;
  } else if (globalVar.keepPanelUnfoldSwitch && !display && !options.force) {
    // 非强制操作时，设置了保持面板展开则收起动作不再生效
    realDisplay = true;
  }

  dispatch({
    type: 'PHONE_SET',
    payload: {
      display: realDisplay,
      toggleTipDisplay: realDisplay ? false : phone.toggleTipDisplay,
    }
  });

  if (!realDisplay && showFoldTip) {
    clearTimeout(toggleTipDisplayTimer);
    dispatch(setToggleTipDisplay(true) as any);
    toggleTipDisplayTimer = setTimeout(() => {
      dispatch(setToggleTipDisplay(false) as any);
    }, 3000)
  }

  if (options.trigger !== ToggleTrigger.sdk) {
    notifyToolbar({
      cmd: 'toggle',
      flag: realDisplay
    });
  }
}

// 加入会议
export const actionJoin = (mode?: PhoneMode) => (dispatch: Store.dispatch) => {
  callPanelDebug('[colJoin]');
  dispatch(actionToggle() as any);
  if (mode !== PhoneMode.sip) sipAdaptor.accept();
  dispatch({
    type: 'PHONE_SET',
    payload: {
      callStatus: 'conference',
      tip: '通话中',
      conference: {
        tip: callStatusMap.conference
      }
    }
  })
  audioRingSound._stop();
}

// 【转接】处理转接
export const handleTransfer = async (data: Common.IObject<any> = {}) => {
  let phone = getPhone();
  callPanelDebug('[sendTransfer] data:%O', data);
  delete data.name;

  const res = await transfer({
    ...data,
    sid: phone.session.sessionId
  });
  handleRes(res, () => true, () => true)
}

export const actionCallOutFail = (message = '未知错误') => (dispatch: Store.dispatch) => {
  dispatch({
    type: 'PHONE_SET',
    payload: {
      callStatus: 'callOutFail',
      tip: message
    }
  })
}

export const actionHangup = (options: Common.IObject<any>, from = '') => async (dispatch: Store.dispatch) => {
  callPanelDebug("[hungup] data %O callUser %O", options, callUser);

  if (audioHangupSound && ['session', 'intercom'].includes(from)) {
    if (!audioHangupSound.hangUpFrom) {
      audioHangupSound._play();
    } else {
      audioHangupSound.hangUpFrom = 0;
    }
  }

  const payload = {};
  if (options.staffstatus === PhoneStatus.process) {
    const callStatus = 'process';
    Object.assign(payload, {
      callStatus,
      tip: callStatusMap[callStatus]
    })
  } else {
    Object.assign(payload, {
      callStatus: 'empty',
      sessionMode: SessionMode.empty,
      speakingNumber: '',
      session: {
        mobileArea: ''
      }
    })
  }
  Object.assign(payload, {
    dialingNumber: '',
    jitterBuffer: 0
  })
  dispatch({
    type: 'PHONE_SET',
    payload
  })
  audioRingSound._stop();
  // TODO
  // nodeRingSound.currentTime = 0;
}

interface IActionAccept {
  options?: Common.IObject<any>,
  autoAnswer?: boolean
}

export const actionAccept = (args: IActionAccept = {}) => (dispatch: Store.dispatch) => {
  const phone = getPhone();
  const { options, autoAnswer } = args;
  callPanelDebug('[colAccept] %O autoanswer %O', options, autoAnswer);
  if (!autoAnswer) {
    clearTimeout(globalVar.autoAnswerTimer);
  }

  eventBus.dispatchEvent('accept'); // TODO this.__session.__emit
  dispatch(actionToggle(false) as any);
  if (!options) {
    if (globalVar.sessionType === SessionType.callIn) {
      globalVar.sessionStatus = SessionStatus.accept;
    }
    sipAdaptor.accept();
  }

  const callStatus = 'speaking'
  dispatch({
    type: 'PHONE_SET',
    payload: {
      callStatus,
      tip: callStatusMap[callStatus]
    }
  })

  audioRingSound._stop();
}

export const actionSetOutCallNumber = (outCallNumber: string) => (dispatch: Store.dispatch) => {
  if (outCallNumber) {
    dispatch({
      type: 'PHONE_SET',
      payload: {
        outCallNumber
      }
    })
    setStorage('YSF-CALLCENTER-DID-KEY', outCallNumber)
  }
}

// 获取本机号码备选列表，初始化本机号码
export const actionSetOutCallNumbers = (outCallRandom: boolean) => async (dispatch: Store.dispatch) => {
  if (!outCallRandom) {
    const {
      outCallNumbers,
      selectedOutCallNumber
    } = await getOutCallNumbers();
    dispatch({
      type: 'PHONE_SET',
      payload: {
        outCallNumbers
      }
    })
    dispatch(actionSetOutCallNumber(selectedOutCallNumber) as any)
  }
}

export const actionSetRestStatusOptions = (options: string | TRestStatus[]) => (dispatch: Store.dispatch) => {
  const restStatusOptions: TRestStatus[] = getType(options) === 'string' ?
    JSON.parse(options as string) : options;
  dispatch({
    type: 'PHONE_SET',
    payload: {
      restStatusOptions
    }
  })
  globalVar.validRestStatusOptions = restStatusOptions.map(restStatus => {
    const seatStatus = restStatusMap[restStatus]
    const result = {
      label: seatStatus.text,
      value: restStatus
    }
    return result
  })
}

export const actionSetStatusOptions = (options: string | PhoneStatus[]) => (dispatch: Store.dispatch) => {
  const phone = getPhone();
  const statusOptions: PhoneStatus[] = getType(options) === 'string' ?
    JSON.parse(options as string) : options;
  dispatch({
    type: 'PHONE_SET',
    payload: {
      statusOptions
    }
  })
  globalVar.validStatusOptions = statusOptions.map(status => {
    const seatStatus = seatStatusMap[status]
    const result = {
      label: seatStatus.text,
      value: status
    }
    if (status === PhoneStatus.rest && phone.restStatusSwitch) {
      Object.assign(result, {
        children: globalVar.validRestStatusOptions
      })
    }
    return result
  })
  if (isToolBar) {
    notifyToolbar({
      cmd: 'statusOptionsChanged',
      config: {
        status: phone.status,
        statusExt: phone.statusExt,
        options: globalVar.validStatusOptions
      }
    })
  }
}

export const actionSetMode = (mode: PhoneMode) => (dispatch: Store.dispatch) => {
  callUser.mode = mode;
  dispatch({
    type: 'PHONE_SET',
    payload: {
      mode
    }
  })
  const handlerMap = {
    [PhoneMode.soft]: () => {
      sipAdaptor.init();
      dispatch({
        type: 'PHONE_RESET',
        payload: {
          statusOptions: true
        }
      })
      dispatch(actionSetStatus({ value: PhoneStatus.offline }) as any)
    },
    [PhoneMode.phone]: () => {
      dispatch(actionSetStatusOptions([4]) as any)
      dispatch(actionSetStatus({ value: PhoneStatus.mobile }) as any)
      sipAdaptor.disconnect();
    },
    [PhoneMode.sip]: () => {
      dispatch(actionSetStatusOptions([5, 2, 6, 0]) as any)
      dispatch(actionSetStatus({ value: PhoneStatus.offline }) as any)
      sipAdaptor.disconnect();
    },
  }
  handlerMap[mode]();
}

export const actionReset = (phone: IExtendedPhone, dispatch: Store.dispatch) => {
  dispatch({
    type: 'PHONE_RESET',
    payload: {
      callStatus: true,
      sessionMode: true,
      dialingNumber: true,
      speakingNumber: true,
      speakingNumberExt: true,
      session: {
        mobileArea: true
      }
    }
  })
}