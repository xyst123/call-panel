import React, { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle, ChangeEvent } from 'react';
import { derivation } from '@/constant/outer';
import { get } from '@/utils';
import { IIVR } from '@/constant/phone';
import usePhone from '@/hooks/phone';
import '@/style/Select-IVR.less';

const { isToolBar } = derivation;

const IVR: React.FC<{
  childRef: React.RefObject<any>
  onSelect: (ivr: IIVR) => void,
  [key: string]: any;
}> = ({ childRef, onSelect, ...props }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null!);
  const { phone } = usePhone();
  const iframePath = `${window.location.origin}/chat/callcenter/page/ivr/cascader?isToolbar=${isToolBar}&sessionId=${phone.session.sessionId}`;

  useImperativeHandle(childRef, () => ({
    reload() {
      const { current: iframe } = iframeRef;
      if (iframe.contentWindow) {
        iframe.contentWindow.location.reload()
      }
    }
  }));

  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent<any>) => {
      const data = get(event, 'data', {});
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

  return <div className="select-ivr" {...props}>
    <iframe ref={iframeRef} width="100%" height="100%" src={iframePath}></iframe>
  </div>
}

export default IVR