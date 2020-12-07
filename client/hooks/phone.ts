import { useSelector, useDispatch } from 'react-redux';
import { IPhoneStatus, IExtendedPhoneStatus, SessionMode, callStatusMap, seatStatusMap, TSeatStatus, restStatusMap, TRestStatus, PhoneMode, memberInitial } from '@/constant/phone';
import { setting, ipccSetting } from '@/constant/outer';
import { debug, handleRes, get } from '@/utils';
import { sipAdaptor } from '@/utils/sip';
import { callOut, intercomCallOut, setStatus, joinConference, transfer } from '@/service/phone';
// @ts-ignore
import { message } from 'ppfish';

const getStatusText = (key: TSeatStatus, subKey: TRestStatus) => {
  if (key === 2 && subKey) {
    return `${seatStatusMap[key]}-${restStatusMap[subKey]}`
  }
  return seatStatusMap[key];
}

export default (): {
  phone: IExtendedPhoneStatus, startCallOut: () => Promise<any>, handleCallOut: () => Promise<any>, startIntercomCallOut: (data: {
    staffid: number,
    name: string
  }) => Promise<any>, handleIntercomCallOut: (remoteStaffId: number) => Promise<any>, handleCallTask: (callTaskData: any) => Promise<any>, startSetStatus: Function, handleConference: (type: string, data: Common.IObject<any>) => Promise<any>, handleTransfer: (data: Common.IObject<any>) => Promise<any>, phoneReset: Function
} => {
  const phone: IExtendedPhoneStatus = useSelector((state: {
    phone: IPhoneStatus;
  }) => {
    const { phone } = state;
    // 添加通用的衍生属性
    return Object.assign(phone, {
      isBusy: phone.callStatus !== 'empty',
      isRinging: ['callIn', 'callOut', 'joinIn'].includes(phone.callStatus),
    })
  });

  const canCallOut = [1, 5, 6].includes(phone.status); // 可外呼状态
  const dispatch = useDispatch();

  // TODO
  const showSecurityBookModal = () => {

  }

  const callOutRequest = async (realDialNumber: string, outCallNumber: string) => {
    const res = await callOut(realDialNumber, outCallNumber);
    handleRes(res, () => {
      // TODO 处理拨号成功
    }, () => {
      // 如果刚好有进线，那么不处理外呼失败提示
      if ((phone.isBusy && phone.callStatus !== 'callOut')) return true;
      switch (res.code) {
        case 8150:
          message.error(res.msg)
          break;
        case 4000:
          showSecurityBookModal();
          break;
      }
      dispatch({
        type: 'PHONE_FAIL',
        payload: res.msg
      })

      // TODO 通知页面头部
    })
  }

  const handleCallOut = async () => {
    // 软电话模式下检查sdk是否初始化完成
    if (phone.mode === 0 && sipAdaptor.status.code !== 0) return message.error(sipAdaptor.status.tip);

    const realDialNumber = phone.dialingNumber.trim();

    if (!realDialNumber) return message.error('电话号码不正确，请重新输入');

    if (!canCallOut) return message.error('电话服务需为在线或者挂起状态，才可外呼客户');

    dispatch({
      type: 'PHONE_SET',
      payload: {
        sessionMode: SessionMode.empty
      }
    })

    const outCallNumber = phone.outCallRandom ? '' : phone.outCallNumber;

    if (!phone.outCallRandom && !outCallNumber) return message.error('请选择外呼号码');

    debug(`[sendCallOut] number: ${phone.outCallNumber}`);

    dispatch({
      type: 'PHONE_SET',
      payload: {
        speakingNumber: realDialNumber,
        callStatus: 'callOut',
        tip: callStatusMap.callOut
      }
    })
    await callOutRequest(realDialNumber, outCallNumber)
  }

  const startCallOut = async () => {
    const disableToolbar = get(setting, 'isToolBar', false) && get(ipccSetting, 'disableToolbar', false);
    if (disableToolbar) return;

    dispatch({
      type: 'PHONE_SET', payload: {
        callTaskData: null
      }
    })

    await handleCallOut();
  }

  const handleIntercomCallOut = async (remoteStaffId: number
  ) => {
    if (!canCallOut)
      return message.error('电话服务需为在线或者挂起状态，才能内部呼叫', 5000);
    dispatch({
      type: 'PHONE_SET', payload: {
        sessionMode: SessionMode.intercom
      }
    })

    window.debug('[sendIntercomCallout]  staffId:%s', remoteStaffId);

    dispatch({
      type: 'PHONE_SET',
      payload: {
        callStatus: 'callOut',
        speakingNumber: phone.dialingNumber.trim(),
        tip: callStatusMap.callOut
      }
    })

    const res = await intercomCallOut(remoteStaffId);
    handleRes(res, () => {
      // TODO 处理拨号成功
    }, () => {
      // 如果刚好有进线，那么不处理外呼失败提示
      if ((phone.isBusy && phone.callStatus !== 'callOut')) return true;
      switch (res.code) {
        case 8150:
          message.error(res.msg)
          break;
        case 4000:
          showSecurityBookModal();
          break;
      }
      dispatch({
        type: 'PHONE_FAIL',
        payload: res.msg
      })

      // TODO 通知页面头部
    })
  }

  const startIntercomCallOut = async (data: {
    staffid: number,
    name: string
  }) => {
    // 软电话模式下检查sdk是否初始化完成
    if (phone.mode === 0 && sipAdaptor.status.code !== 0) return message.error(sipAdaptor.status.tip);

    const { staffid: remoteStaffId, name: remoteStaffName } = data;
    if (canCallOut) {
      dispatch({
        type: 'PHONE_SET',
        payload: {
          intercom: {
            remoteStaffId,
            remoteStaffName
          }
        }
      })
    }

    await handleIntercomCallOut(remoteStaffId)
  }

  const handleCallTask = async (callTaskData: any) => {
    const { phone: dialNumber, did: outCallNumber } = callTaskData.param;
    dispatch({
      type: 'PHONE_SET',
      payload: {
        callTaskData,
        speakingNumber: dialNumber,
        callStatus: 'callOut',
        tip: callStatusMap.callOut,
      }
    })
    dispatch({
      type: 'TOOLBAR_SET',
      payload: {
        open: true
      }
    })
    await callOutRequest(dialNumber, outCallNumber)
  }

  const handleSetStatus = async (seatStatus: TSeatStatus, restStatus: TRestStatus, type: string, callback: Function) => {
    const data = { status: String(seatStatus), statusExt: restStatus ? String(restStatus) : undefined };
    const statusText = seatStatus === 2 ? '小休' : '挂起';

    // 禁用状态选择下拉框
    dispatch({
      type: 'PHONE_SET',
      payload: {
        statusSelectDisabled: true
      }
    })

    // TODO changecallstatus
    // me.$emit('changecallstatus');

    debug('[sendStatus]  status:%s', getStatusText(seatStatus, restStatus));

    const res = await setStatus(type, data);
    handleRes(res, () => {
      const payload: Common.IObject<any> = {
        statusSelectDisabled: false,
        status: seatStatus,
        statusExt: restStatus,
      }

      callback && callback(true);

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
      if (seatStatus === 0 && phone.mode === PhoneMode.soft && phone.isBusy) sipAdaptor.disConnect();

      // 统一 dispatch
      dispatch({
        type: 'PHONE_SET',
        payload
      })
    }, () => {
      const payload: Common.IObject<any> = {
        statusSelectDisabled: false,
      }
      callback && callback(false);

      // TODO changecallstatusfailed
      // me.$emit('changecallstatusfailed');

      const onCancel = () => {
        dispatch({ type: 'GLOBAL_RESET', payload: { modalConfig: true } })
      }
      switch (res.code) {
        case 8150:
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
          showSecurityBookModal();
          break;
        case 40001:
          message.error(`你的今日${statusText}已达上限`)
          break;
        case 40002:
          message.error(`你已触达${statusText}限制条件，请在呼叫系统导航点击 '提交申请'，等待管理员审批。`, 5000)
          break;
        case 40003:
          message.error(`你有尚未完结的${statusText}申请，请勿重复提交`)
          break;
        case 40004:
          message.warning(`请按申请内容，切换至 ${getStatusText(seatStatus, restStatus)}`)
          break;
        default:
          message.error(res.msg)
      }

      // 统一 dispatch
      dispatch({
        type: 'PHONE_SET',
        payload
      })
    })

    // TODO onstatusload
    // this.__emit('onstatusload', {
    //   options: data,
    //   result: res.data
    // });
  }

  const startSetStatus = async (options: Common.IObject<any>) => {
    if (phone.kickedOut) {
      const status = get(setting, 'callUser.status', 0);
      if (options.value || status) {
        options.value = 0;
      }
      debug(`[sendStatus] ${seatStatusMap[status].kickedText || '账号被踢'}`);
    }

    const { mockManualSwitch, confirmCallback, value, type } = options;
    // auto为true表示自动发起的切换；为false表示是用户手动切换
    const autoSwitch = mockManualSwitch ? !mockManualSwitch : !confirmCallback;
    const [seatStatus, restStatus] = Array.isArray(value) ? value : [value, ''];

    debug(
      '[changeStatus]  status:%s mode:%d',
      getStatusText(seatStatus, restStatus),
      phone.mode
    );

    // 用户手动切换状态时，状态切换
    // 开启小休细分&切换小休时，检测二级状态是否相同; 其他情况只检测一级状态是否相同
    if (phone.status === 2 && phone.restStatusSwitch) {
      if (
        seatStatus === phone.status &&
        restStatus == phone.statusExt &&
        !autoSwitch
      ) return;
    } else {
      if (seatStatus == phone.status && !autoSwitch) return;
    }
    // 切换为离线，直接返回
    if (seatStatus === 0) return handleSetStatus(seatStatus, restStatus, type, confirmCallback);
    // sip话机和手机在线模式，直接切换状态
    if (phone.mode !== PhoneMode.soft) return handleSetStatus(seatStatus, restStatus, type, confirmCallback);
    // sdk初始化成功，直接切换状态
    if (sipAdaptor.status.code === 0) return handleSetStatus(seatStatus, restStatus, type, confirmCallback);
    const handleSIPError = () => {
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
      handleSetStatus(seatStatus, restStatus, type, confirmCallback);
    }, 1000);
  }

  const handleConference = async (type: string, data: Common.IObject<any> = {}) => {
    debug(`[${type}] data:%O`, data);
    const { name: memberName } = data;
    delete data.name;

    const realData = {
      ...data,
      sid: phone.session.sessionId
    }

    // 主持坐席使用号码
    const { outCallRandom, outCallNumber, outCallNumbers } = phone;
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
      const member = {
        ...memberInitial,
        id: json.member,
        name: memberName,
        time: (json.time || Date.now()) + 60 * 1000, // 1分钟自动挂断
        state: 0
      }
      dispatch({
        type: 'PHONE_SET',
        payload: {
          conference: {
            members: {
              ...phone.conference.members,
              [member.id]: member
            }
          }
        }
      })
    }, () => true)
  }

  const handleTransfer = async (data: Common.IObject<any> = {}) => {
    debug('[sendTransfer] data:%O', data);
    delete data.name;

    const res = await transfer({
      ...data,
      sid: phone.session.sessionId
    });
    handleRes(res, () => true, () => true)
  }

  const phoneReset = () => {
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

  return { phone, startCallOut, handleCallOut, startIntercomCallOut, handleIntercomCallOut, handleCallTask, startSetStatus, handleConference, handleTransfer, phoneReset };
}