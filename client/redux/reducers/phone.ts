import { get, assignState, resetState } from '@/utils';
import { setting, corpPermission } from '@/constant/outer';
import { IPhone, PhoneMode, TRestStatus, SessionMode, PhoneStatus } from '@/constant/phone';

const callUser = get(setting, 'callUser', {});
const softStatusOptions: PhoneStatus[] = get(corpPermission, 'OUTCALL_TASKFORECAST', false) ? [1, 2, 6, 0, 8] : [1, 2, 6, 0];
const statusInitial = parseInt(get(callUser, 'status', 0));
const intercomInitial = {
  intercomId: 0,
  remoteStaffId: 0,
  remoteStaffName: '',
  intercomFlag: ''
}
const conferenceInitial = {
  sessionId: '',
  chairmanId: '',
  chairmanName: '',
  tip: '',
  conferenceId: '',
  members: {},
  state: 0
}
const initialState: IPhone = {
  display: true,
  toggleTipDisplay: false,
  mode: get(callUser, 'mode', PhoneMode.soft),
  statusCached: statusInitial,
  status: statusInitial,
  statusExt: (statusInitial === 2 ? parseInt(get(callUser, 'statusExt', 0)) : 0) as TRestStatus,
  statusSelectDisabled: false,
  statusOptions: softStatusOptions,
  restStatusOptions: [],
  isAutoAnswerFirstTips: true,
  outCallRandom: get(callUser, 'outcallRandom', false),
  outCallNumbers: [],
  outCallNumber: '',
  restStatusSwitch: get(callUser, 'restStatusSwitch', 0),
  sessionMode: SessionMode.empty,
  callStatus: statusInitial === PhoneStatus.process ? 'process' : 'empty',
  jitterBuffer: 0,
  isCaller: true,
  inNextAnswer: false,
  inNextAnswerCounter: 3,
  kickedOut: false,
  tip: '',
  callTaskData: null,
  dialingNumber: '',
  speakingNumber: '',
  speakingNumberExt: '',
  showDial: false,
  intercom: { ...intercomInitial },
  conference: { ...conferenceInitial },
  session: {
    sessionId: 0,
    mobileArea: '北京',
    username: '夏杨',
    vipLevel: 1,
    callTransfer: {
      type: 1,
      transferFrom: '111'
    }
  }
};

export const phone = (
  state = initialState,
  action: Store.IAction
) => {
  switch (action.type) {
    case 'PHONE_SET':
      return assignState(action.payload, state);
    case 'PHONE_RESET':
      return resetState(action.payload, state, initialState);
    default:
      return state;
  }
};


