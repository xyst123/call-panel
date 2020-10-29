import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Routes } from '@/router';
import store from '@/redux/store';

import '@/style/reset.less';
import '@/style/iconfont.less';

function requestPermission() {
  return new Promise((resolve, reject) => {
    const permissionPromise = Notification.requestPermission((result) => {
      resolve(result);
    });
    if (permissionPromise) {
      permissionPromise.then(resolve, reject);
    }
  }).then((result) => {
    if (result !== 'granted') {
      throw new Error('用户拒绝接收通知');
    }
  });
}

// const { serviceWorker } = window.navigator;

// if (
//   (window.location.protocol === 'https:' ||
//     window.location.hostname === 'localhost') &&
//   serviceWorker
// ) {
//   serviceWorker
//     .register('/serviceWorker.js')
//     .then((registration) => {
//       requestPermission();
//     })
//     .catch((error) => {
//       console.error(error);
//     });
// }

// @ts-ignore
window.setting={
  isToolBar:true, // 工具条
  callUser:{
    status:0,
    mode:0,
    outcallRandom:false
  },
  user:{
    authority:{
      KEFU_INTERCOM_OUT:true
    }
  }
}

// @ts-ignore
window.corpPermission={
  IPCC_INEER_CALL:true
}

// @ts-ignore
window.debug=(type: string)=>{
  return ()=>{
    
  }
}

ReactDOM.render(
  <Provider store={store}>
    <Routes />
  </Provider>,
  document.getElementById('root')
);
