import { get } from '@/utils';
export const setting = {
  isToolBar: true, // 工具条
  callUser: {
    status: 1,
    mode: 0,
    username: "10100600000105",
    outcallRandom: false,
    appId: "e7ccb39f9bb547c7b22aa040ef726f03",
    password: "07bcp72g",
    maxDealTime: 10,
    autoAnswerSwitch: 0,
    restStatusSwitch: false,
    statusOptions: [
      1,
      2,
      6,
      0,
      8
    ],
    restStatusList: [
      1,
      3,
      5,
      6
    ],
  },
  user: {
    id: 0,
    authority: {
      KEFU_INTERCOM_OUT: true,
      CUSTOMER_FULLNUMBER_SHOW: false
    },
    call: {
      ringUrl: 'https://ysf.nosdn.127.net/ysf_callin_ring.mp3'
    }
  },
};

export const corpPermission = {
  CALLCENTER_CONFERENCE: true,
  IPCC_INEER_CALL: true,
}

export const ipccSetting = {
  disableToolbar: false,
  enabledThirdPlatform: 1,
  enableWorkbench: true
}

export const appConfig = {
  path: {
    kefu: ''
  }
}

export const derivation = {
  user: get(setting, 'user', {}),
  callUser: get(setting, 'callUser', {}),
  isToolBar: get(setting, 'isToolBar', {}),
  disableToolbar: get(ipccSetting, 'disableToolbar', false),
  hideCustomerNumber: !get(setting, 'user.authority.CUSTOMER_FULLNUMBER_SHOW', true), // 是否隐藏对方号码
  isIntercomAllowed: get(corpPermission, 'IPCC_INEER_CALL', false) && get(setting, 'user.authority.KEFU_INTERCOM_OUT', false), // 是否有内部通话权限
}