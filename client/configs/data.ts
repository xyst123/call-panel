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

interface ISDKStatus {
  code:number,
  tip: string
}

export const sipAdaptorStatusMap:{
  [key:string]: ISDKStatus
} = {
  success: {
    code: 0,
    tip:''
  },
  initializing: {
    code: 1,
    tip:'电话功能尚未初始化完成，请刷新或稍后重试！'
  },
  initializeFail: {
    code: 2,
    tip:'电话功能初始化失败，请刷新或稍后重试!'
  },
  microphoneNotFount: {
    code: 3,
    tip:'未找到可用的麦克风，请检查麦克风设置并刷新页面重试'
  },
  microphoneDisabled: {
    code: 4,
    tip:'麦克风被禁用，请检查麦克风设置并刷新页面重试'
  },
  unsafe: {
    code: 5,
    tip:'非安全模式不允许使用音频，请切换成HTTPS方式登录后使用'
  },
  connectingNotReady: {
    code: 6,
    tip:'电话功能尚未初始化完成，正在努力工作中，请刷新或稍后重试!'
  },
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

export const callStatusMap = {
  pause:'暂停中',
  process:'处理中',
  callIn:'等待接听',
  callOut:'拨号中',
  joinIn:'邀请你进入多方通话',
  conference:'正在主持当前多方通话',
  mute:'静音中',
  speaking: '通话中',
}

// 电话客服在线状态
interface IStatus {
  text: string;
  value: number;
  icon: string;
  color: string;
  kickedText?: string;
}
export const seatStatusMap:{
  [key: number]:IStatus;
} = {
  0: { text: '离线', value: 0, icon: 'kfzt-lxx',color:'#b6b6b6',},
  1: { text: '在线', value: 1, icon: 'kfzt-zxx',color:'#53c251' },  //web在线
  2: { text: '小休', value: 2, icon: 'kfzt-xxx',color:'#f8a755' },
  3: { text: '通话中', value: 3, icon: 'kfzt-thzx',color:'#53c251',kickedText:'通话中被踢' },
  4: { text: '手机在线', value: 4, icon: 'phonex',color:'#53c251' },
  5: { text: '在线', value: 5, icon: 'kfzt-zxx',color:'#53c251' },  //sip话机在线
  6: { text:'挂起', value: 6, icon: 'kfzt-gqx',color:'#b6b6b6' },
  7: { text: '处理中', value: 7, icon: 'kfzt-jxzx',color:'#53c251', kickedText:'处理中被踢' },
  8: { text: '自动外呼', value: 8, icon: 'kfzt-zdwhx',color:'#53c251' },
};

// 小休状态细分
export const restStatusMap = {
  1: {text: '就餐', value: 1, icon: 'kfzt-xx-jcx'},
  2: {text: '会议', value: 2, icon: 'kfzt-xx-hyx'},
  3: {text: '培训', value: 3, icon: 'kfzt-xx-pxx'},
  4: {text: '休息', value: 4, icon: 'kfzt-xxx'},
  5: {text: '洗手间', value: 5, icon: 'kfzt-xx-xsjx'},
  6: {text: '其他', value: 6, icon: 'kfzt-xx-qtx'},
};