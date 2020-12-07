import React, { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle, ChangeEvent } from 'react';
// @ts-ignore
import { Input } from 'ppfish';
import useGlobal from '@/hooks/global';
import { get } from '@/utils';
import '@/style/Select-Other.less';

const Other: React.FC<any> = ({ phoneNumber, childRef, onInput }: {
  phoneNumber: string,
  childRef: React.RefObject<any>
  onInput: Function
}) => {
  const { global } = useGlobal();
  const actionText = get(global, 'selectModalConfig.extData.action', '');

  useEffect(() => {

  }, [])

  return <div className="select-other">
    <div className="select-other-content">
      <p>{`${actionText}第三方支持您通过输入特定的电话或座机号码，将电话咨询${actionText}非企业客服人员。`}</p>
      <div>
        <p>邀请第三方</p>
        <Input type="tel" value={phoneNumber} placeholder="请输入对方手机号或座机号" maxLength={12} autoFocus={true} onChange={(event: any) => {
          const value = event.target.value.replace(/\D/g, '')
          onInput(value)
        }} />
      </div>
    </div>
  </div>
}

export default Other