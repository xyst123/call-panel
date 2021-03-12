import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Select, SelectOption } from '@/components/Select';
import { seatStatusMap, restStatusMap } from '@/constant/phone';
import { PhoneMode, PhoneStatus, TRestStatus } from '@/constant/phone';
import { sipAdaptor } from '@/utils/sip';
import { checkCallStatus, sendMessage } from '@/utils/phone';
import { corpPermission, derivation } from '@/constant/outer';
import { setPhoneMode } from '@/service/phone';
import { get, handleRes, getType } from '@/utils';
import { message } from 'ppfish';
import usePhone from '@/hooks/phone';
import { actionSetStatus, actionSetOutCallNumber, actionSetOutCallNumbers, actionSetMode, actionSetStatusOptions, actionSetRestStatusOptions, actionIntercomCallOut } from '@/redux/actions/phone';
import '@/style/CallHeader.less';

const { callUser, isIntercomAllowed } = derivation;
const softStatusOptions: PhoneStatus[] = get(corpPermission, 'OUTCALL_TASKFORECAST', false) ? [1, 2, 6, 0, 8] : [1, 2, 6, 0];

const getNetworkLevel = (jitterBuffer: number): string => {
  if (jitterBuffer < 100) return 'highest';
  if (jitterBuffer < 200) return 'higher';
  if (jitterBuffer < 300) return 'high';
  else return 'low';
}

const CallHeader: React.FC<Common.IObject<any>> = () => {
  const { phone } = usePhone();
  const { statusOptions, restStatusOptions, outCallRandom, outCallNumber, outCallNumbers, jitterBuffer, restStatusSwitch } = phone;
  const networkLevel = getNetworkLevel(jitterBuffer);
  const dispatch = useDispatch();

  const callNumber = useMemo(() => {
    if (outCallRandom) {
      return <><i className="iconfont icon-random" title="已开启随机外呼模式，本机号码随机生成"></i><p>随机</p></>
    }
    if (outCallNumbers.length > 1) {
      return <Select defaultValue={outCallNumber} className="line-numbers" onChange={(value: string) => {
        dispatch(actionSetOutCallNumber(value))
      }}>
        {outCallNumbers.map(item => <SelectOption key={item} value={item} label={item} className={`line-numbers-item ${item === outCallNumber ? 'line-numbers-item_selected' : ''}`}>
          <p>{item}</p>
          <i className="iconfont icon-check-line-regular"></i>
        </SelectOption>)}
      </Select>
    }
    if (outCallNumbers.length === 1) {
      return <p>{outCallNumbers[0]}</p>
    }
    return null
  }, [phone, outCallNumbers])

  // 切换 mode
  const handleToggleMode = async () => {
    const targetMode = phone.mode === PhoneMode.phone ? PhoneMode.soft : PhoneMode.phone;
    const res = await setPhoneMode(targetMode);

    handleRes(res, () => {
      dispatch(actionSetMode(targetMode));
      sendMessage('onchangecallmode', { mode: targetMode })
    }, () => true)
  }

  const handleIntercom = () => {
    dispatch({
      type: 'GLOBAL_SET_SELECT_MODAL',
      payload: {
        type: 'intercom',
        handler(data: {
          staffid: number,
          name: string
        }) {
          const checkResult = checkCallStatus({
            hasInit: sipAdaptor.status.tip,
          }, phone);
          if (checkResult) {
            return message.error(checkResult)
          }

          const { staffid: remoteStaffId, name: remoteStaffName } = data;
          if (phone.canCallOut) {
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

          dispatch(actionIntercomCallOut(remoteStaffId) as any);
        }
      }
    })
  }

  useEffect(() => {
    dispatch(actionSetOutCallNumbers(outCallRandom))
  }, [outCallRandom]);

  useEffect(() => {
    dispatch(actionSetRestStatusOptions(get(callUser, 'restStatusList', [])));
    dispatch(actionSetStatusOptions(get(callUser, 'statusOptions', softStatusOptions)));
  }, []);

  return (
    <div className="call-header">
      <div className="line">
        <p className="line-mode-text">电话服务</p>
        <i className="iconfont icon-phonex line-mode" style={{ color: phone.mode !== PhoneMode.phone ? '#888' : 'inherit' }} title={phone.mode !== PhoneMode.phone ? '点击切换为手机在线' : '点击切换为软电话'} onClick={handleToggleMode}></i>
        {/* TODO 网络延迟 */}
        {jitterBuffer > 0 ? <i title={`当前通话网络延迟:${jitterBuffer}ms`} className={`u-icon-wifi line-network_${networkLevel}`}></i> : null}
        <i className="line-indicator" style={{ backgroundColor: seatStatusMap[phone.status].color }}></i>
        <Select className="line-statuses" defaultValue={phone.status} disabled={phone.statusSelectDisabled} overflowY='visible' onChange={(value: number | number[]) => {
          dispatch(actionSetStatus({ value }))
        }}>
          {statusOptions.map(status => {
            const currentStatus = seatStatusMap[status];
            const showRestStatusOptions = currentStatus.value === 2 && restStatusSwitch
            const subOptions = showRestStatusOptions ? restStatusOptions.map((restStatus) => {
              const currentRestStatus = restStatusMap[restStatus];
              return (
                <SelectOption key={currentRestStatus.value} value={[currentStatus.value, currentRestStatus.value]} label={`${currentStatus.text}-${currentRestStatus.text}`} width={98} className="line-statuses-item">
                  <i className={`iconfont icon-${currentRestStatus.icon}`} style={{ color: currentStatus.color }}></i>
                  <p>{currentRestStatus.text}</p>
                </SelectOption>
              )
            }) : [];
            return (
              <SelectOption key={currentStatus.value} value={currentStatus.value} label={currentStatus.text} subOptions={subOptions} width={98} className="line-statuses-item">
                <i className={`iconfont icon-${currentStatus.icon}`} style={{ color: currentStatus.color }}></i>
                <p>{currentStatus.text}</p>
                {
                  showRestStatusOptions ? <i className="iconfont icon-arrowright"></i> : null
                }
              </SelectOption>
            )
          })}
        </Select>
      </div>
      <div className="line">
        <p>本机号码：</p>
        {callNumber}
        {
          isIntercomAllowed ? <i className="iconfont icon-callout" onClick={handleIntercom}></i> : null
        }
      </div>

    </div >
  );
};

export default CallHeader;