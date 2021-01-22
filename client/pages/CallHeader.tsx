import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Select, SelectOption } from '@/components/Select';
import { seatStatusMap, restStatusMap } from '@/constant/phone';
import { PhoneMode } from '@/constant/phone';
import { setting, corpPermission } from '@/constant/outer';
import { setPhoneMode, getOutCallNumbers } from '@/service/phone';
import { get, mapObject, handleRes, getStorage, setStorage } from '@/utils';
import usePhone, { startSetStatus, startIntercomCallOut } from '@/hooks/phone';
import useGlobal from '@/hooks/global';
import '@/style/CallHeader.less';

const user = get(setting, 'user', {});
const callUser = get(setting, 'callUser', {});
const softSelectOptions = [1, 2, 6, 0, 8];
const phoneSelectOptions = [4];
const defaultRestStatus = 1;
// 是否有内部通话权限
const isIntercomAllowed =
  get(corpPermission, 'IPCC_INEER_CALL', false) && get(setting, 'user.authority.KEFU_INTERCOM_OUT', false);

const getNetworkLevel = (jitterBuffer: number): string => {
  if (jitterBuffer < 100) return 'highest';
  if (jitterBuffer < 200) return 'higher';
  if (jitterBuffer < 300) return 'high';
  else return 'low';
}

const CallHeader: React.FC<Common.IObject<any>> = () => {
  const { phone } = usePhone();
  const { global } = useGlobal();
  const [restStatus, setRestStatus] = useState<number>(defaultRestStatus);

  const { outCallRandom, outCallNumber, outCallNumbers, jitterBuffer } = phone;
  const networkLevel = getNetworkLevel(jitterBuffer);
  const dispatch = useDispatch();

  const callNumber = useMemo(() => {
    if (outCallRandom) {
      return <><i className="iconfont icon-random" title="已开启随机外呼模式，本机号码随机生成"></i><p>随机</p></>
    }
    if (outCallNumbers.length > 1) {
      return <Select defaultValue={outCallNumber} className="line-numbers" onChange={(value: string) => { handleSetOutCallNumber(value) }}>
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

  const handleSetOutCallNumber = (value: string) => {
    if (value) {
      dispatch({
        type: 'PHONE_SET',
        payload: {
          outCallNumber: value
        }
      })
      setStorage('outCallNumber', value)
    }
  }

  // 切换 mode
  const handleToggleMode = async () => {
    const targetMode = phone.mode === PhoneMode.phone ? PhoneMode.soft : PhoneMode.phone;
    const res = await setPhoneMode(targetMode);
    handleRes(res, () => {
      dispatch({
        type: 'PHONE_SET',
        payload: {
          mode: targetMode
        }
      })
    })
  }

  // 获取本机号码备选列表，初始化本机号码
  const handleGetOutCallNumbers = async () => {
    if (!outCallRandom) {
      const res = await getOutCallNumbers()
      handleRes(res, () => {
        const { data = [] } = res;
        dispatch({
          type: 'PHONE_SET',
          payload: {
            outCallNumbers: data
          }
        })

        let selectedOutCallNumber = '';
        if (data.length === 1) {
          selectedOutCallNumber = data[0]
        } else if (data.length > 1) {
          selectedOutCallNumber = getStorage('outCallNumber');
          if (!data.includes(selectedOutCallNumber)) {
            selectedOutCallNumber = data[0]
          }
        }
        handleSetOutCallNumber(selectedOutCallNumber)
      }, () => { })
    }
  }

  const handleIntercom = () => {
    dispatch({
      type: 'GLOBAL_SET_SELECT_MODAL',
      payload: {
        type: 'intercom',
        handler: startIntercomCallOut(phone, dispatch)
      }
    })
  }

  useEffect(() => {
    handleGetOutCallNumbers()
  }, [outCallRandom]);


  return (
    <div className="call-header">
      <div className="line">
        <p className="line-mode-text">电话服务</p>
        <i className="iconfont icon-phonex line-mode" style={{ color: phone.mode !== PhoneMode.phone ? '#888' : 'inherit' }} title={phone.mode !== PhoneMode.phone ? '点击切换为手机在线' : '点击切换为软电话'} onClick={handleToggleMode}></i>
        {/* TODO 网络延迟 */}
        {jitterBuffer > 0 ? <i title={`当前通话网络延迟:${jitterBuffer}ms`} className={`u-icon-wifi line-network_${networkLevel}`}></i> : null}
        <i className="line-indicator" style={{ backgroundColor: seatStatusMap[phone.status].color }}></i>
        <Select className="line-statuses" defaultValue={phone.status} disabled={phone.statusSelectDisabled} overflowY='visible' onChange={(value: number | number[]) => {
          startSetStatus(phone, dispatch)({ value })
        }}>
          {softSelectOptions.map(option => {
            const currentStatus = seatStatusMap[option];
            const subOptions = currentStatus.value === 2 ? mapObject(restStatusMap, (currentRestStatus) => (
              <SelectOption key={currentRestStatus.value} value={[currentStatus.value, currentRestStatus.value]} label={`${currentStatus.text}-${currentRestStatus.text}`} width={98} className="line-statuses-item">
                <i className={`iconfont icon-${currentRestStatus.icon}`} style={{ color: currentStatus.color }}></i>
                <p>{currentRestStatus.text}</p>
              </SelectOption>
            )) : [];
            return (
              <SelectOption key={currentStatus.value} value={currentStatus.value} label={currentStatus.text} subOptions={subOptions} width={98} className="line-statuses-item">
                <i className={`iconfont icon-${currentStatus.icon}`} style={{ color: currentStatus.color }}></i>
                <p>{currentStatus.text}</p>
                {
                  currentStatus.value === 2 ? <i className="iconfont icon-arrowright"></i> : null
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

    </div>
  );
};

export default CallHeader;