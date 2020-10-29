import axios, { AxiosRequestConfig, Method } from 'axios';
import qs from 'qs';
// @ts-ignore
import {message} from 'ppfish';

export const iterateObject = (
  object: { [key: string]: any },
  handler: (value: any, key: string, object?: { [key: string]: any }) => void
) => {
  const keys = Object.keys(object);
  keys.forEach((key) => {
    const value = object[key];
    handler(value, key, object);
  });
};

export const mapObject = (
  object: { [key: string]: any },
  handler: (value: any, key: string, object?: { [key: string]: any }) => void
) => {
  const keys = Object.keys(object);
  return keys.map((key) => {
    const value = object[key];
    return handler(value, key, object);
  });
};

export const get = (object: any, props: string, defaultValue: any) => {
  if (!object) return defaultValue;
  const temp: string[] = props.split('.');
  const realProps = [...temp];
  temp.forEach((item) => {
    const reg = /^(\w+)\[(\w+)\]$/;
    const matches = item.match(reg);
    if (Array.isArray(matches)) {
      const field1 = matches[1];
      const field2 = matches[2];
      const replaceIndex = realProps.indexOf(item);
      realProps.splice(replaceIndex, 1, field1, field2);
    }
  });

  return realProps.reduce((prevObject, prop) => {
    const curObject =
      prevObject[prop] === undefined ? defaultValue : prevObject[prop];
    if (curObject instanceof Array) {
      return [...curObject];
    }
    if (curObject instanceof Object) {
      return { ...curObject };
    }
    return curObject;
  }, object);
};

interface IRequestOptions {
  url: string;
  method?: string;
  type?: string;
  params?: { [key: string]: any };
  data?: any;
  headers?: { [key: string]: string };
}
export const request = async <T>({
  method = 'GET',
  url = '',
  type = '',
  params = {},
  data = {},
  headers = {},
}: IRequestOptions): Promise<T> => {
  method = method.toUpperCase();
  const realParams = {};
  if (method === 'GET') {
    Object.assign(realParams, params, data);
  } else {
    Object.assign(realParams, params);
    if (type === 'form') {
      data = qs.stringify(data);
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
  }
  
  const options: AxiosRequestConfig = {
    method: <Method>method,
    url,
    data,
    params: realParams,
    headers,
  };

  let abort = null;
  const promise = new Promise<T>((resolve) => {
    abort = () => {
      resolve(new Error('abort') as any);
    };
    axios(options)
      .then((res) => {
        resolve(res.data);
      })
      .catch((error) => {
        resolve(error);
      });
  });
  // @ts-ignore
  promise.abort = abort;

  return promise;
};

const successCode = 200;
export const getRes = (
  res: any,
  message: { [key: string]: string } = {}
): Common.IRes => {
  const code = parseInt(get(res, 'code', '-1'));
  if (code === successCode) {
    return {
      status: true,
      code,
      msg: message[String(successCode)] || '',
    };
  }
  console.error(res);
  return {
    status: false,
    code,
    data: res,
    msg: message[String(code)] || message['-1'] || '',
  };
};

export const handleRes=(res:Common.IRes,successCallback:Function=Function.prototype,failCallback:Function=Function.prototype)=>{
  const {status,msg} = res;
  if(status){
    const forbidAlert=successCallback(res.data);
    if(msg && !forbidAlert){
      message.success(msg);
    }
  } 
  const forbidAlert=failCallback(res.data);
  if(msg && !forbidAlert){
    message.error(msg);
  }
}

const add0 = (number: number) => (number < 10 ? `0${number}` : number);
export const dateFormat = (date: Date, format = 'yyyy-MM-dd HH:mm:ss') => {
  const [yyyy, MM, dd, HH, mm, ss] = [
    date.getFullYear(),
    add0(date.getMonth() + 1),
    add0(date.getDate()),
    add0(date.getHours()),
    add0(date.getMinutes()),
    add0(date.getSeconds()),
  ];
  const dateMap = {
    yyyy,
    MM,
    dd,
    HH,
    mm,
    ss,
  };
  iterateObject(dateMap, (value, key) => {
    format = format.replace(key, value);
  });
  return format;
};

export const getType = (value: any): string =>
  Object.prototype.toString
    .call(value)
    .replace(/\[|\]|object|\s/g, '')
    .toLowerCase();

export const getFirstName = (name: string) => {
  if (name.length > 2) {
    return name.substring(name.length - 2);
  }
  return name.substring(1);
};

export const getStorage = (key: string, props?: string, defaultValue?: any) => {
  const data = window.localStorage.getItem(key);
  try {
    if (!data) {
      return defaultValue === undefined ? data : defaultValue;
    }
    const realData = JSON.parse(data);
    if (props) {
      return get(realData, props, defaultValue);
    }
    return realData;
  } catch (error) {
    return data;
  }
};

export const setStorage = (key: string, value: any, assign: boolean = true) => {
  const previousData = getStorage(key);
  if (getType(value) === 'object') {
    if (assign && getType(previousData) === 'object') {
      window.localStorage.setItem(
        key,
        JSON.stringify(Object.assign(previousData, value))
      );
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } else if (getType(value) === 'array') {
    window.localStorage.setItem(key, JSON.stringify(value));
  } else {
    window.localStorage.setItem(key, value);
  }
};

export const getRandom = (from: number, to: number): number => {
  return parseInt(String(from + (to - from) * Math.random()), 10);
};

export const delay = async <T>(
  callback: Function,
  time: number
): Promise<T> => {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
  return callback();
};

const windowWidth =
  document.compatMode === 'CSS1Compat'
    ? document.documentElement.clientWidth
    : document.body.clientWidth;
export const getVw = (px: number) =>
  Number(((100 * Number(px)) / windowWidth).toFixed(3));

export const getUrlQuery = (key?: string): any => {
  const result: Common.IObject<string> = {};

  decodeURI(window.location.search.slice(1))
    .split('&')
    .forEach((pair) => {
      const [key, value] = pair.split('=');
      result[key] = value;
    });

  return key ? result[key] : result;
};

export const iterateMatchDOM = (DOM: HTMLElement, target: HTMLElement): boolean => {
  if (DOM===target) {
    return true;
  }
  if (DOM === document.documentElement) {
    return false;
  }
  return iterateMatchDOM(DOM.parentNode as HTMLElement, target);
};

// @ts-ignore
export const debug = (info:string)=>{
  console.log(info)
}

export const getStackTrace = () => {
  const object:any = {};
  Error.captureStackTrace(object, getStackTrace);
  return object.stack;
};
