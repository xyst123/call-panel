// soft 软电话 phone 手机在线 sip sip话机
export enum PhoneMode {
  soft,
  phone,
  sip
}

// empty 未设定 normal 外部通话 intercom 内部通话
export enum SessionMode {
  empty,
  normal,
  intercom,
}

export enum SDKStatus {
  success,
  initializing,
  initializeFail,
  microphoneNotFount,
  microphoneDisabled,
  unsafe,
  connectingNotReady,
}

export interface IPhoneStatus {
  mode: PhoneMode,
  statusCached: number, // 缓存坐席状态
  status: number, // 坐席状态
  statusExt: number, // 坐席状态
  statusSelectDisabled: boolean,
  isAutoAnswerFirstTips: boolean,
  outCallRandom: boolean,  // 是否随机号码
  restStatusSwitch: 0 | 1 // 是否开启小休细分
  outCallNumber: string // 本机号码
  sessionMode: SessionMode,
  callStatus: keyof CallStatusMap,
  jitterBuffer: number, // 网络延时
  isCaller: boolean,
  inNextAnswer: false,  // 是否顺振
  inNextAnswerCounter: number,  // 顺振倒计时
  autoAnswerTimer: number,
  nextAnswerTimer: number,
  kickedOut: boolean, // 是否被踢出
  tip: string,
  callTaskData: any,
  dialingNumber: string,  // 拨打的号码
  speakingNumber?: string,  // 用户号码
  speakingNumberExt?: string, // 带分机号的用户号码
  // 内部通话相关
  intercom: {
    intercomId: number,  // 内部通话会话 id
    remoteStaffId: string,
    remoteStaffName: string,
    intercomFlag: string,  // 通话标识
  }
  // 外部通话-多方相关
  conference: {
    sessionId: string,
    chairmanId: string, // 主持人
    chairmanName: string,
    tip: string, // 信息标识
    conferenceId: string,
    members: any,
  },
  // 外部通话-会话相关
  session: {
    sessionId: number,  // 非内部通话会话 id
    hideCustomerNumber?: boolean,  // 是否隐藏用户号码
    mobileArea?: string,  // 地域标识
    username?: string, // 用户名
    vipLevel?: number, // 用户等级
    callTransfer?: any, // 转接相关
  }
}

export interface IExtendedPhoneStatus extends IPhoneStatus {
  isBusy: boolean,
  isRinging: boolean,
}

// 电话客服在线状态
interface IStatus {
  text: string;
  value: number;
  icon: string;
  color: string;
  kickedText?: string;
}
export const seatStatusMap: {
  [key: number]: IStatus;
} = {
  0: { text: '离线', value: 0, icon: 'kfzt-lxx', color: '#b6b6b6', },
  1: { text: '在线', value: 1, icon: 'kfzt-zxx', color: '#53c251' },  //web在线
  2: { text: '小休', value: 2, icon: 'kfzt-xxx', color: '#f8a755' },
  3: { text: '通话中', value: 3, icon: 'kfzt-thzx', color: '#53c251', kickedText: '通话中被踢' },
  4: { text: '手机在线', value: 4, icon: 'phonex', color: '#53c251' },
  5: { text: '在线', value: 5, icon: 'kfzt-zxx', color: '#53c251' },  //sip话机在线
  6: { text: '挂起', value: 6, icon: 'kfzt-gqx', color: '#b6b6b6' },
  7: { text: '处理中', value: 7, icon: 'kfzt-jxzx', color: '#53c251', kickedText: '处理中被踢' },
  8: { text: '自动外呼', value: 8, icon: 'kfzt-zdwhx', color: '#53c251' },
};
export type TSeatStatus = keyof (typeof seatStatusMap);

// 小休状态细分
export const restStatusMap = {
  1: { text: '就餐', value: 1, icon: 'kfzt-xx-jcx' },
  2: { text: '会议', value: 2, icon: 'kfzt-xx-hyx' },
  3: { text: '培训', value: 3, icon: 'kfzt-xx-pxx' },
  4: { text: '休息', value: 4, icon: 'kfzt-xxx' },
  5: { text: '洗手间', value: 5, icon: 'kfzt-xx-xsjx' },
  6: { text: '其他', value: 6, icon: 'kfzt-xx-qtx' },
};
export type TRestStatus = keyof (typeof restStatusMap);

// 呼叫状态
export const callStatusMap = {
  empty: '',
  pause: '暂停中',
  process: '处理中',
  callIn: '等待接听',
  callOut: '拨号中',
  joinIn: '邀请你进入多方通话',
  conference: '正在主持当前多方通话',
  mute: '静音中',
  speaking: '通话中',
  callFail: ''
}

type CallStatusMap = typeof callStatusMap;
