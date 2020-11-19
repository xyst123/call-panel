import { get, assignState, resetState } from '@/utils';
import { setting } from '@/constant/outer';
import { PhoneMode, SessionMode } from '@/constant/phone';

const callUser = get(setting, 'callUser', {});
const statusInitial = parseInt(get(callUser, 'status', 0));
const intercomInitial = {
  intercomId: 0,
  remoteStaffId: '',
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
}
const initialState = {
  mode: get(callUser, 'mode', PhoneMode.soft),
  statusCached: statusInitial,
  status: statusInitial,
  statusExt: parseInt(get(callUser, 'statusExt', 0)),
  statusSelectDisabled: false,
  isAutoAnswerFirstTips: false,
  outCallRandom: get(callUser, 'outcallRandom', false),
  restStatusSwitch: get(callUser, 'restStatusSwitch', 0),
  outCallNumber: '',
  sessionMode: SessionMode.empty,
  callStatus: statusInitial === 7 ? 'process' : 'empty',
  jitterBuffer: 0,
  isCaller: true,
  inNextAnswer: false,
  inNextAnswerCounter: 3,
  autoAnswerTimer: null,
  nextAnswerTimer: null,
  kickedOut: false,
  tip: '',
  callTaskData: null,
  dialingNumber: '',
  speakingNumber: '',
  speakingNumberExt: '',
  intercom: { ...intercomInitial },
  conference: { ...conferenceInitial },
  session: {
    sessionId: 0,
    hideCustomerNumber: true,
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
    case 'PHONE_FAIL':
      return assignState({
        callStatus: 'callFail',
        tip: action.payload
      }, state);
    default:
      return state;
  }
};


