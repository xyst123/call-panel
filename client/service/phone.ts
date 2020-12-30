import { request, getRes } from '@/utils';
import { seatStatusMap, groupStatusMap, PhoneMode, IMember } from '@/constant/phone';

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
    return res
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
    return res
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
    return res
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
    return res
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
    return res
  } catch (error) {
    return getRes(error, message);
  }
};


export const intercomCallOut = async (staffId: number): Promise<Common.IRes> => {
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
    return res
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
    return res
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
    return res
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
    return res
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
    return res
  } catch (error) {
    return getRes(error, message);
  }
};

const handleSeats = (seats: Common.IObject<any>[]) => {
  seats.forEach((seat) => {
    const { value, modalIcon, modalStatus } = seatStatusMap[seat.status] || {};
    Object.assign(seat, {
      _disabled: ![1, 5].includes(value),
      _intercomIconClassName: modalIcon ? `icon-${modalIcon}` : '',
      _intercomStatusClassName: modalStatus ? `item_${modalStatus}` : '',
    })
  });
}

const handleGroups = (groups: Common.IObject<any>[]) => {
  groups.forEach((group) => {
    const { value, modalIcon, modalStatus } = groupStatusMap[group.status] || {};
    Object.assign(group, {
      _disabled: ![1].includes(value),
      _intercomIconClassName: modalIcon ? `icon-${modalIcon}` : '',
      _intercomStatusClassName: modalStatus ? `item_${modalStatus}` : '',
    })
  });
}

export const getSeats = async (groupId?: number): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'GET',
      url: groupId ? `/api/callcenter/intercom/groupInfo` : `api/callcenter/intercom/kefuInfo`,
      data: { groupId }
    });
    const res = getRes(response, message);
    if (res.status) {
      handleSeats(response.result.kefu)
    }
    return res
  } catch (error) {
    return getRes(error, message);
  }
};

export const getTransfers = async (): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'GET',
      url: `/api/callcenter/transfer`
    });
    const res = getRes(response, message);
    if (res.status) {
      handleSeats(response.result.kefu)
      handleGroups(response.result.group)
    }
    return res
  } catch (error) {
    return getRes(error, message);
  }
};

export const joinConference = async (type: string, data: Common.IObject<any>): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/conference/${type}`,
      data
    });
    const res = getRes(response, message);
    return res
  } catch (error) {
    return getRes(error, message);
  }
};

export const transfer = async (data: Common.IObject<any>): Promise<Common.IRes> => {
  const message = {
    '-1': '提交失败'
  };
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/session/transfer`,
      data
    });
    const res = getRes(response, message);
    return res
  } catch (error) {
    return getRes(error, message);
  }
};

export const getThirdList = async (): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'GET',
      url: `/api/callcenter/settings/thirdplatform/list`,
    });
    const res = getRes(response, message);
    return res
  } catch (error) {
    return getRes(error, message);
  }
};

export const muteMember = async (type: string, data: Common.IObject<any>): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/conference/${type}`,
      data
    });
    const res = getRes(response, message);
    return res
  } catch (error) {
    return getRes(error, message);
  }
};

export const deleteMember = async (data: Common.IObject<any>): Promise<Common.IRes> => {
  const message = {};
  try {
    const response = await request<Common.IObject<any>>({
      method: 'POST',
      url: `/api/callcenter/conference/delmember`,
      data
    });
    const res = getRes(response, message);
    return res
  } catch (error) {
    return getRes(error, message);
  }
};