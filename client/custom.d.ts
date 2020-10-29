declare namespace Common {
  interface IRes {
    status: boolean;
    code: number;
    msg: string;
    data?: any;
  }
  interface IObject<T> {
    [key: string]: T;
  }
  interface IValueLabel {
    label: string;
    value: any;
  }
}

declare namespace Phone {
  interface IStatus {
    mode: PhoneMode,
    originStatus:number,
    status: number,
    outCallRandom: boolean,  // 是否随机号码
    outCallNumber: string // 本机号码
    sessionMode: SessionMode,
    isBusy: Boolean,
    callStatus: string,
    callingNumber: string, // 当前通话的电话号码
    tip: string,
  }
}

declare namespace Store {
  interface IAction {
    type: string;
    payload: any;
  }
}

interface RefObject<T> {
  current: T;
}
