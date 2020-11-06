import { get } from '@/utils';
import {setting} from '@/constant/outer';
import {PhoneMode,SessionMode,IPhoneStatus} from '@/constant/phone';

const callUser = get(setting,'callUser',{});
const status = get(callUser,'status',0);

export const phone = (
state = {
  mode: get(callUser,'mode',PhoneMode.soft),
  cachedStatus: status,
  status: status,
  outCallRandom: get(callUser,'outcallRandom',false),
  outCallNumber: '',
  sessionMode: SessionMode.empty,
  callStatus: status===7?'process':'empty',
  jitterBuffer: 0,
  sessionId: 0,
  isCaller: true,
  inNextAnswer: false,
  inNextAnswerCounter: 3,
  intercom: {
    remoteStaffName: '111111',
    intercomFlag: '111111'
  },
  conference:{
    chairmanName: '111111',
    tip: '111111'
  },
  session:{
    hideCustomerNumber: true,
    speakingNumbers: '17610217100',
    mobileArea: '111111',
    username: '夏杨',
    vipLevel: 1,
    callTransfer: {
      type: 1,
      transferFrom: '111'
    }
  }
},
  action: Store.IAction
) => {
  switch (action.type) {
    case 'PHONE_SET':
      return {
        ...state,
        ...action.payload
      };
    // case 'SESSION_BEGIN':
    //   const {payload} = action
    //   return {
    //     ...state,
    //     // sessionMode: '',
    //     speakingNumber: payload.usernumber,
    //     speakingArea: payload.address || '',
    //     sessionId: payload.sessionid || 0,
    //     // callTransfer: payload.callTransfer,
    //     status: payload.staffstatus,
    //     username: payload.username || '',
    //     vipLevel: payload.viplevel || 0
    //   };
    default:
      return state;
  }
};
