import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import CallHeader from '@/pages/CallHeader';
import CallDial from '@/pages/CallDial';
import CallBusy from '@/pages/CallBusy';
import { sipAdaptor } from '@/utils/sip';
// @ts-ignore
import { Modal, message } from 'ppfish';
import IntercomModal from '@/pages/SelectModal';
import { callStatusMap, PhoneMode } from '@/constant/phone';
import { get, iterateObject } from '@/utils';
import { setting } from '@/constant/outer';
import { audioRingSound } from '@/constant/element';
import usePhone from '@/hooks/phone';
import useGlobal from '@/hooks/global';
import '@/style/CallPanel.less';

const callUser = get(setting, 'callUser', {});

const CallPanel: React.FC<any> = () => {
  const { phone, handleCallOut } = usePhone();
  const { global } = useGlobal();

  const dispatch = useDispatch();

  // 配置 ws 消息回调
  const wsCallbackConfig = {
    cbRinging() {
      window.debug('[ringing] callUser %O', callUser);
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

  const toggleToolbar = (open: boolean) => {
    dispatch({
      type: 'TOOLBAR_SET',
      payload: {
        open
      }
    })
  }

  useEffect(() => {
    iterateObject({
      // 媒体对象检测
      mediaError(options: any) {
        // @ts-ignore
        window.debug("[mediaError] 浏览器WEBRTC模块出现内部错误 data %O callUser %O", options, setting.callUser);
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
          handleCallOut();
        }
        toggleToolbar(true);
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

    // 软电话模式下，初始化sip账号
    if (phone.mode === PhoneMode.soft) {
      sipAdaptor.init();
    }
  }, [])

  return <div className="call-panel">
    <CallHeader></CallHeader>
    {
      phone.isBusy ? <CallBusy></CallBusy> : <CallDial></CallDial>
    }
    <Modal {...global.modalConfig}>
      {global.modalConfig.children}
    </Modal>
    <IntercomModal />
  </div>
};

export default CallPanel;
