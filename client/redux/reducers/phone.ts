import { get } from '@/utils';
import {PhoneMode,SessionMode} from '@/configs/data';
const callUser = get(window,'setting.callUser',{});

const status = get(callUser,'status',0);
const initialState:Phone.IStatus={
  mode: get(callUser,'mode',PhoneMode.soft),
  originStatus: status,
  status: status,
  outCallRandom: get(callUser,'outcallRandom',false),
  outCallNumber: '',
  sessionMode: SessionMode.empty,
  isBusy: status === 7,
  callStatus: status===7?'process':'empty',
  callingNumber: '',
  tip:'',
}
export const phone = (
  state = initialState,
  action: Store.IAction
):Phone.IStatus => {
  switch (action.type) {
    case 'PHONE_SET':
      return {
        ...state,
        ...action.payload
      };
    default:
      return state;
  }
};
