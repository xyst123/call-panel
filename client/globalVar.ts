import { SessionType, SessionStatus, PhoneStatus, TRestStatus } from '@/constant/phone';

// 全局变量
const globalVar: {
  sessionStatus: SessionStatus,
  sessionType: SessionType,
  keepPanelUnfoldSwitch: boolean,
  autoAnswerTimer: NodeJS.Timeout,
  resetAfterByeTimer: NodeJS.Timeout,
  validStatusOptions: {
    label: string, value: PhoneStatus, children?: TRestStatus[]
  }[],
  validRestStatusOptions: {
    label: string, value: TRestStatus,
  }[]
} = {
  sessionStatus: 0,
  sessionType: 0,
  keepPanelUnfoldSwitch: false,
  // @ts-ignore
  autoAnswerTimer: -1,
  // @ts-ignore
  resetAfterByeTimer: -1,
  validStatusOptions: [],
  validRestStatusOptions: []
};

export default globalVar;
