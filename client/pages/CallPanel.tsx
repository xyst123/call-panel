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
import { callStatusMap, PhoneMode, seatStatusMap } from '@/constant/phone';
import { get, iterateObject, getDebug } from '@/utils';
import { setting } from '@/constant/outer';
import { audioRingSound } from '@/constant/element';
import usePhone, { handleCallOut } from '@/hooks/phone';
import useGlobal from '@/hooks/global';
import '@/style/CallPanel.less';

const callUser = get(setting, 'callUser', {});
const callPanelDebug = getDebug('callpanel');

const CallPanel: React.FC<Common.IObject<any>> = () => {
  const { phone } = usePhone();
  const { global } = useGlobal();

  const dispatch = useDispatch();

  // 配置 ws 消息回调
  const wsCallbackConfig = {
    cbRinging() {
      callPanelDebug('[ringing] callUser %O', callUser);
      dispatch({
        type: 'PHONE_SET',
        payload: {
          callStatus: 'callIn',
          tip: callStatusMap.callIn
        }
      });
      audioRingSound.play();
    }
  }

  useEffect(() => {
    // 注册sipAdaptor事件回调
    iterateObject({
      // 媒体对象检测
      mediaError(options: any) {
        callPanelDebug("[mediaError] 浏览器WEBRTC模块出现内部错误 data %O callUser %O", options, setting.callUser);
      },
      // 来电事件
      ringing(options: any) {
        // 来电时的类型 type：1-呼入 2-呼出 3-监听 4-转接  5-预测式外呼 6-会议邀请 7-内部呼出 8-内部接听 
        // 目前1和4弹屏，2和3直接接听
        if ([2, 3, 7].includes(options.type)) {
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
      call(options: any) {
        // 非空闲状态不处理
        if (phone.isBusy) return;

        // YSF-32256 呼叫工具条设置隐号且不能外呼的情况下, 面板不显示号码
        const isToolbar = options.source === 'toolbar'; // 是否是呼叫工具条触发此回调
        const canCallOut = [1, 4, 5, 6].includes(phone.status); // 可外呼状态

        const hideNumber = !get(setting, 'user.authority.CUSTOMER_FULLNUMBER_SHOW', true) && isToolbar && !canCallOut;

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
          handleCallOut(phone, dispatch)();
        }

        dispatch({
          type: 'PHONE_SET',
          payload: {
            display: true
          }
        })
      },
      // 提示用户重启浏览器
      warning(options: any) {
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
      }
    }, (handler, event) => {
      sipAdaptor.addEventListener(event, handler)
    })

    iterateObject({
      // 能否发消息
      '-1000': {
        handler() {
          // 客服端收到客户端握手指令
          // TODO
        }
      },
      foreignLoad() {

      },
      // 外呼任务
      callTask() {

      },
      // 会话加载完成
      detailLoad() {

      },
      // 对方接听
      accepted() {

      },
      // 云信通知会话开始，用于显示电话号码
      sessionBegin() {

      },
      sessionClose() {

      },
      // 呼入通话自动接起
      autoAnswerSwitch() {

      },
      // 电话音频内容推送（电话开始到电话结束）
      sessionAudioAnswer() {

      },
      // 云信通知内部会话开始，用于显示电话号码
      intercomBegin() {

      },
      intercomClose() {

      },
      // 内部通话对方接听
      intercomAccepted() { },
      // 180-199留给电话会议使用
      // 通知电话会议开始
      '180': {
        handle(options: Common.IObject<any>) {
          callPanelDebug('onconferencebegin  %O', options);
          // TODO this.data.state = 'conference';
          dispatch({
            type: 'PHONE_SET',
            payload: {
              callStatus: 'joinIn',
              conference: {
                sessionId: options.sessionId,
                conferenceId: options.conferenceId,
              }
            }
          })
        }
      },
      '181': {
        handle(options: Common.IObject<any>) {

        }
      },
      // 会议邀请
      conferenceJoin() { },
      conferenceJoined() { },
      conferenceLeft() { },
      conferenceMuted() { },
      conferenceUnmuted() { },
    }, (handler, event) => {
      eventBus.addEventListener(event, handler)
    })

    // 软电话模式下，初始化sip账号
    if (phone.mode === PhoneMode.soft) {
      sipAdaptor.init();
    }
  }, [])

  const toggleDisplay = () => {
    dispatch({
      type: 'PHONE_SET',
      payload: {
        display: !phone.display
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
    <div className="call-panel-title" onClick={toggleDisplay}>
      <i className={`iconfont icon-${currentStatus.icon}`} style={{ color: currentStatus.color }}></i>
      <p>{currentStatus.text}</p>
    </div>
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
