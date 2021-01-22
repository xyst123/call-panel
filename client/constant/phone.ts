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

export interface IModalCallbacks { reset(): void, reload(): void }

export interface IMember {
  member: string,
  memberName: string,
  state: 0 | 1,
  isChairman: boolean,
  mute: 0 | 1,
  time: number
}

export interface IPhoneStatus {
  display: boolean,
  mode: PhoneMode,
  statusCached: number, // 缓存坐席状态
  status: number, // 坐席状态
  statusExt: number, // 坐席状态
  statusSelectDisabled: boolean,
  isAutoAnswerFirstTips: boolean,
  outCallRandom: boolean,  // 是否随机号码
  outCallNumbers: string[], // 本机号码备选列表
  outCallNumber: string // 本机号码
  restStatusSwitch: 0 | 1 // 是否开启小休细分
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
    remoteStaffId: number,
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
    members: Common.IObject<IMember>,
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
  canCallOut: boolean,
}

// 电话客服在线状态
interface IStatus {
  text: string;
  value: number;
  icon: string;
  color: string;
  kickedText?: string;
  modalIcon?: string;
  modalStatus?: string;
}
export const seatStatusMap: {
  [key: number]: IStatus;
} = {
  0: { text: '离线', value: 0, icon: 'kfzt-lxx', color: '#b6b6b6', modalStatus: 'disabled' },
  1: { text: '在线', value: 1, icon: 'kfzt-zxx', color: '#53c251', modalIcon: 'kfOnline' },  // web在线
  2: { text: '小休', value: 2, icon: 'kfzt-xxx', color: '#f8a755', modalIcon: 'kfRest', modalStatus: 'busy' },
  3: { text: '通话中', value: 3, icon: 'kfzt-thzx', color: '#53c251', kickedText: '通话中被踢', modalIcon: 'kfBusy', modalStatus: 'busy' },
  4: { text: '手机在线', value: 4, icon: 'phonex', color: '#53c251', modalIcon: 'mobile', modalStatus: 'disabled' },
  5: { text: '在线', value: 5, icon: 'kfzt-zxx', color: '#53c251', modalIcon: 'kfOnline' }, // SIP话机在线
  6: { text: '挂起', value: 6, icon: 'kfzt-gqx', color: '#b6b6b6', modalIcon: 'kfHangup', modalStatus: 'busy' },
  7: { text: '处理中', value: 7, icon: 'kfzt-jxzx', color: '#53c251', kickedText: '处理中被踢', modalIcon: 'kfBusy', modalStatus: 'busy' },
  8: { text: '自动外呼', value: 8, icon: 'kfzt-zdwhx', color: '#53c251', modalIcon: 'kfForecast', modalStatus: 'busy' },
};
export type TSeatStatus = keyof (typeof seatStatusMap);

interface IGroupStatus {
  value: number,
  modalStatus?: string,
  modalIcon?: string,
}
export const groupStatusMap: {
  [key: number]: IGroupStatus;
} = {
  0: {
    value: 0,
    modalStatus: 'disabled',
  },
  1: {
    value: 1,
    modalIcon: 'kfOnline'
  },
  2: {
    value: 2,
    modalStatus: 'disabled',
    modalIcon: 'kfBusy'
  },
}
export type TGroupStatus = keyof (typeof groupStatusMap);

// 小休状态细分
export const restStatusMap = {
  1: { text: '就餐', value: 1, icon: 'kfzt-xx-jcx' },
  2: { text: '会议', value: 2, icon: 'kfzt-xx-hyx' },
  3: { text: '培训', value: 3, icon: 'kfzt-xx-pxx' },
  4: { text: '休息', value: 4, icon: 'kfzt-xxx' },
  5: { text: '洗手间', value: 5, icon: 'kfzt-xx-xsjx' },
  6: { text: '其他', value: 6, icon: 'kfzt-xx-qtx' },
};
export type TRestStatus = keyof typeof restStatusMap;

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

export interface ISeat {
  id: number,
  status: TSeatStatus,
  realname: string,
  _disabled: boolean,
  _intercomIconClassName?: string,
  _intercomStatusClassName?: string,
}

export interface IGroup {
  id: number,
  status: TGroupStatus,
  name: string,
  _disabled: boolean,
  _intercomIconClassName?: string,
  _intercomStatusClassName?: string,
}

export interface IIVR {
  value: number,
  label: string,
  ivrId: number,
}

export const memberInitial = {
  id: '', // 成员标识
  name: '', // 成员名
  isChairman: false, // 是否是会议主席
  conferenceId: 0, // 会议id 
  state: 0, // 成员是否加入
  mute: 0, // 成员是否静音
  time: 0 // 成员加入时间，用于显示时按时间排序
};

export enum TabKey {
  seat,
  group,
  groupSeat,
  ivr,
  other
}

export const modalMap = {
  intercom: {
    text: '选择内部通话对象',
    tabs: [{
      id: TabKey.seat,
      name: '呼叫坐席'
    }, {
      id: TabKey.groupSeat,
      name: '客服组'
    }],
    extData: {
      action: '内部通话',
    },
  },
  conference: {
    text: '选择邀请对象',
    tabs: [{
      id: TabKey.seat,
      name: '呼叫坐席'
    }, {
      id: TabKey.other,
      name: '邀请第三方'
    }],
    extData: {
      action: '邀请',
    }
  },
  transfer: {
    text: '选择转接对象',
    tabs: [{
      id: TabKey.seat,
      name: '呼叫坐席'
    }, {
      id: TabKey.group,
      name: '客服组'
    }, {
      id: TabKey.ivr,
      name: 'IVR'
    }, {
      id: TabKey.other,
      name: '第三方'
    }],
    extData: {
      action: '转接',
    }
  },
}

export type ModalType = keyof typeof modalMap;
