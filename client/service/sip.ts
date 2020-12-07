import { request, getRes } from '@/utils';

export const getSIPList = async (): Promise<Common.IRes> => {
  const message = {
    '-1': '设置不成功',
    '18050': '模式参数错误',
    '18051': '切换失败，请先设置转接的手机号码',
    '15232': '会话还未结束，不能切换呼叫服务模式',
  };
  try {
    const response = await request<Common.IObject<any>>({
      method: 'GET',
      url: `/api/callcenter/lbs/sip/list`,
    });
    const res = getRes(response, message);
    return res
  } catch (error) {
    return getRes(error, message);
  }
};
