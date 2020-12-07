import React, { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle, ChangeEvent } from 'react';
// @ts-ignore
import { setting } from '@/constant/outer';
import { get } from '@/utils';
import usePhone from '@/hooks/phone';
import '@/style/Select-IVR.less';

const IVR: React.FC<any> = ({ childRef, onSelect }: {
  childRef: React.RefObject<any>
  onSelect: Function
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { phone } = usePhone();
  const iframePath = `${window.location.origin}/chat/callcenter/page/ivr/cascader?isToolbar=${setting.isToolBar}&sessionId=${phone.session.sessionId}`;

  useImperativeHandle(childRef, () => ({
    reload() {
      const { current: iframe } = iframeRef
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.location.reload()
      }
    }
  }));

  useEffect(() => {
    const handleIframeMessage = (event: Common.IObject<any>) => {
      const data = event.data || {};
      const { method } = data
      if (method === 'callingTransferIVRChange') {
        const options = get(data, 'params.options', [])
        const option = options[options.length - 1] || {};
        if (option.value) {
          onSelect(option)
        }
      }
    }
    window.addEventListener("message", handleIframeMessage);
    return () => {
      window.removeEventListener("message", handleIframeMessage);
    }
  }, [])

  return <div className="select-ivr">
    <iframe ref={iframeRef} width="100%" height="100%" src={iframePath}></iframe>
  </div>
}

export default IVR