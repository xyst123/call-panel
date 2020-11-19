import { request, getRes } from '@/utils';
import { PhoneMode } from '@/constant/phone';

export const setPhoneMode = async (
  mode: PhoneMode,
): Promise<Common.IRes> => {
  const message = {
    '-1': '设置不成功',
    '18050': '模式参数错误',
    '18051': '切换失败，请先设置转接的手机号码',
    '15232': '会话还未结束，不能切换呼叫服务模式',
  };
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/callModeSetting/set`,
      data: { mode },
    });
    return getRes(response, message);
  } catch (error) {
    return getRes(error, message);
  }
};

export const getOutCallNumbers = async (): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'GET',
      url: `/api/callcenter/did/staff/list`,
    });
    const res = getRes(response, message);
    return res.status ? {
      ...res,
      data: response.result
    } : res
  } catch (error) {
    return getRes(error, message);
  }
};

export const getSetting = async (): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'GET',
      url: `/api/callcenter/settings/list`,
    });
    const res = getRes(response, message);
    return res.status ? {
      ...res,
      data: response.result
    } : res
  } catch (error) {
    return getRes(error, message);
  }
};

export const callOut = async (dialNumber: string, outCallNumber: string): Promise<Common.IRes> => {
  const message = {
    '-1': '未知错误',
    '8150': '电话功能被禁用'
  };
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/outcall`,
      type: 'form',
      data: {
        phone: dialNumber,
        did: outCallNumber
      }
    });
    const res = getRes(response, message);
    return res.status ? {
      ...res,
      data: response.result
    } : res
  } catch (error) {
    return getRes(error, message);
  }
};

export const mute = async (sessionId: number): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/session/mute`,
      type: 'form',
      data: {
        id: sessionId
      }
    });
    const res = getRes(response, message);
    return res.status ? {
      ...res,
      data: response.result
    } : res
  } catch (error) {
    return getRes(error, message);
  }
};

export const unmute = async (sessionId: number): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/session/unmute`,
      type: 'form',
      data: {
        id: sessionId
      }
    });
    const res = getRes(response, message);
    return res.status ? {
      ...res,
      data: response.result
    } : res
  } catch (error) {
    return getRes(error, message);
  }
};


export const intercomCallOut = async (staffId: string): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/intercom/outcall`,
      type: 'form',
      data: {
        staffId
      }
    });
    const res = getRes(response, message);
    return res.status ? {
      ...res,
      data: response.result
    } : res
  } catch (error) {
    return getRes(error, message);
  }
};

export const intercomMute = async (intercomId: number): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/intercom/mute`,
      type: 'form',
      data: {
        id: intercomId,
      }
    });
    const res = getRes(response, message);
    return res.status ? {
      ...res,
      data: response.result
    } : res
  } catch (error) {
    return getRes(error, message);
  }
};

export const intercomUnmute = async (intercomId: number): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/intercom/unmute`,
      type: 'form',
      data: {
        id: intercomId,
      }
    });
    const res = getRes(response, message);
    return res.status ? {
      ...res,
      data: response.result
    } : res
  } catch (error) {
    return getRes(error, message);
  }
};

export const sessionCheck = async (sessionId: number): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/session/check`,
      type: 'form',
      data: {
        sid: sessionId,
      }
    });
    const res = getRes(response, message);
    return res.status ? {
      ...res,
      data: response.result
    } : res
  } catch (error) {
    return getRes(error, message);
  }
};


export const setStatus = async (type: string, data: Common.IObject<any>): Promise<Common.IRes> => {
  const message = {
    '-1': '状态切换失败，请稍后重试'
  };
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: type === 'over-process' ? `/api/callcenter/deal/setStatus` : `/api/callcenter/setStatus`,
      type: 'form',
      data
    });
    const res = getRes(response, message);
    return res.status ? {
      ...res,
      data: response.result
    } : res
  } catch (error) {
    return getRes(error, message);
  }
};


