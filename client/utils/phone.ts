import { ipccSetting } from '@/constant/outer';
import { get, limitLength, toolbarDebug } from '@/utils/index';
import { appConfig } from '@/constant/outer';
import { IExtendedPhone, PhoneMode, PhoneStatus, TRestStatus } from '@/constant/phone';
import { sipAdaptor } from '@/utils/sip';
import { notificationSound } from '@/constant/element';

export const notifyToolbar = (data: Common.IObject<any>) => {
  toolbarDebug("[notify] data %O  selfWindow %O", data, window.parent === window);
  if (window.parent === window) return;
  window.parent.postMessage(JSON.stringify(data), '*');
}

// 初始化自动接起设置
export const preserveAutoAnswerSwitch = (value: number) => {
  sessionStorage.setItem('YSF-CALL-AUTOANSWER', String(value));
}

// 跳转到正在服务页面
export const navigateToServingPage = (id: number) => {
  const isServing = /(\/chat\/callcenter\/(\?id=(\d)+)?)$/.test(window.location.pathname);
  // 当前页面为服务中页面或非工作台跳转模式的页面
  if (isServing || !get(ipccSetting, 'enableWorkbench', false)) {
    window.location.replace(`/chat/callcenter/?id=${id}`);
  }
}

const handlerMap = {
  callSession: (data: Common.IObject<any>) => {
    const title = '呼叫中心通知';
    const name = limitLength(data.usernumber, 15);
    const options = {
      id: data.sessionid,
      body: `用户 ${name} 来电中，正在等待服务`,
      icon: data.path.kefu + 'res/img/notification.png',
      rurl: '/chat/callcenter/?id=' + data.sessionid
    };
    return {
      title,
      options
    }
  },
  callTransfer: (data: Common.IObject<any>) => {
    const title = '转接通知';
    const name = limitLength(data.usernumber, 15);
    const transferFrom = get(data, 'callTransfer.transferFrom', '');
    const options = {
      id: data.id,
      body: `用户${name}来电(转接自${transferFrom})，正在等待服务`,
      icon: get(appConfig, 'path.kefu', '') + 'res/img/notification.png',
      rurl: '/chat/callcenter/?id=' + data.sessionid
    };
    return {
      title,
      options
    }
  },
}
type NotificationType = keyof (typeof handlerMap);

interface INotificationItem {
  id: string,
  body: Notification,
  timer: number
}
let notificationGranted = false;
const notificationQueue: INotificationItem[] = [];
if (window.Notification) {
  Notification.requestPermission((permission) => {
    notificationGranted = permission === 'granted';
  });
}

// 展示通知
export const showNotification = (type: NotificationType, data: any) => {
  const { title, options } = handlerMap[type](data);
  // PC端飘窗提醒
  if (window.cefQuery) {
    window._nativeApi.showNotification(title, options);
    return
  }
  if (notificationGranted) {
    if (!notificationSound._playing) {
      notificationSound._play();
    }
    const notificationItem = {
      id: options.id,
      body: new Notification(title, options),
      timer: window.setTimeout(
        () => {
          notificationItem.body.close();
        }, 20000
      )
    };
    if (notificationQueue.length >= 3) {
      const notificationFirst = notificationQueue.shift();
      if (notificationFirst) {
        notificationFirst.body.close();
      }
    }
    notificationQueue.push(notificationItem);
    notificationItem.body.addEventListener('click', () => {
      window.focus();
      window.location.replace(options.rurl || '/chat/')
      notificationItem.body.close();
    });
    notificationItem.body.addEventListener('close', () => {
      clearTimeout(notificationItem.timer);
      const index = notificationQueue.indexOf(notificationItem);
      if (index > -1) {
        notificationQueue.splice(index, 1);
      }
    });
  };
}

interface ICheckCallStatus {
  hasInit?: string,
  canCallOut?: string,
  isBusy?: string
}

export const checkCallStatus = ({
  hasInit, canCallOut, isBusy
}: ICheckCallStatus, phone: IExtendedPhone) => {
  // 软电话模式下检查sdk是否初始化完成
  if (hasInit && phone.mode === PhoneMode.soft && sipAdaptor.status.code !== 0) return hasInit;
  if (canCallOut && !phone.canCallOut) return '电话服务需为在线或者挂起状态，才可外呼客户';
  if (isBusy && phone.isBusy && phone.callStatus !== 'callOutFail') return '当前正在通话，不允许外呼';
  return ''
}

export const sdkSetStatusFailed = (status: PhoneStatus, statusExt: TRestStatus, errorMessage: string) => {
  notifyToolbar({
    cmd: 'statusChangeFailed',
    data: {
      status,
      statusExt,
      errorMsg: errorMessage
    }
  })
}

export const sendMessage = (type: string, data?: any) => {

}

export const receiveMessage = () => {

}
