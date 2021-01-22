declare module 'ppfish';

interface Window {
  debug: Function,
  CallPanel: any,
  cefQuery: boolean,
  QiyuConnect: any
}
declare let debug: Window["debug"];

interface Promise {
  abort: Function | null,
}

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

declare namespace Store {
  interface IAction {
    type: string;
    payload: any;
  }
}

interface RefObject<T> {
  current: T;
}
