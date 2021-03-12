import React, { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle, ChangeEvent } from 'react';
import { Input, Radio, Tooltip } from 'ppfish';
import { modalMap } from '@/constant/phone';
import useGlobal from '@/hooks/global';
import { get, handleRes } from '@/utils';
import { getThirdList } from '@/service/phone';
import { ipccSetting } from '@/constant/outer';
import '@/style/Select-Other.less';

const RadioGroup = Radio.Group;
const enabledThirdPlatform = get(ipccSetting, 'enabledThirdPlatform', false);

const Other: React.FC<{
  phoneNumber: string,
  onInput: (phoneNumber: string) => void,
  [key: string]: any;
}> = ({ phoneNumber, onInput, ...props }) => {
  const [transferType, setTransferType] = useState(0);
  const [thirdList, setThirdList] = useState<any[]>([]);
  const { global } = useGlobal();
  const actionText = get(global, 'selectModalConfig.extData.action', 0);
  const isTransfer = actionText === modalMap.transfer.extData.action;

  const handleGetThirdList = async () => {
    const thirdList = await getThirdList();
    setThirdList(thirdList)
  }

  useEffect(() => {
    if (isTransfer) {
      handleGetThirdList()
    }
  }, [])

  return <div className="select-other" {...props}>
    {
      isTransfer && enabledThirdPlatform ? <RadioGroup className="select-other-options" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        setTransferType(parseInt(event.target.value))
      }} value={transferType}>
        <Radio value={0}>转接到其他第三方</Radio>
        <Radio value={1}>转接到第三方呼叫中心</Radio>
      </RadioGroup> : null
    }

    {
      isTransfer && transferType === 0 || !isTransfer ? <div className="select-other-input">
        <p>{`${actionText}第三方支持您通过输入特定的电话或座机号码，将电话咨询${actionText}非企业客服人员。`}</p>
        <div>
          <p>邀请第三方</p>
          <Input type="tel" value={phoneNumber} placeholder="请输入对方手机号或座机号" maxLength={12} autoFocus={true} onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value.replace(/\D/g, '')
            onInput(value)
          }} />
        </div>
      </div> : <ul className="select-other-select">
          {
            thirdList.map(thirdPlatform => (<Tooltip key={thirdPlatform.phone} title={`${thirdPlatform.name}(${thirdPlatform.telphone})`}>
              <li onClick={() => {
                onInput(thirdPlatform.telphone)
              }} className={`${thirdPlatform.telphone === phoneNumber ? 'selected' : ''}`}>
                <span>{thirdPlatform.name}</span>
                {`(${thirdPlatform.telphone})`}
              </li>
            </Tooltip>))
          }
        </ul>
    }
  </div>
}

export default Other