import {seatStatusMap,sipAdaptorStatusMap} from '@/configs/data';
import {get,getType,getStackTrace} from '@/utils';
import {getSIPList} from '@/service/sip';
import { handleRes } from '.';

// @ts-ignore
window.debug=(type: string)=>{
  return ()=>{
    
  }
}

interface IServerOptions {
  codeTip: ICodeTip,
  proxy?: object,
  options?: object,
  error?:any
}

interface ICodeTip {
  code:number,
  tip: string
}

interface IRTCConfig {
  iceServers: Array<any>,
  iceTransportPolicy: string
}

interface IAnswerOptions {
  mediaConstraints:{
    audio: boolean,
    video: boolean
  }
  pcConfig:IRTCConfig | null;
  mediaStream?:MediaStream
}

const loginStatusMap:{
  [key:string]: ICodeTip
} = {
  init: {
    code: 0,
    tip: '服务初始化'
  },
  getting: {
    code: 1,
    tip: '服务获取中'
  },
  selecting: {
    code: 2,
    tip: '服务选定，连接中'
  },
  connecting: {
    code: 3,
    tip: '服务连接成功'
  },
  success: {
    code: 4,
    tip: '服务连接成功-存在错误重连中'
  },
  error: {
    code: 5,
    tip: '服务连接失败'
  },
  fail: {
    code: 6,
    tip: '服务选择中'
  },
}

const sipServerStatusMap:{
  [key:string]: ICodeTip
} = {
  init: {
    code: 0,
    tip: '服务获取中'
  },
  sipSuccess: {
    code: 1,
    tip: '服务连接成功'
  },
  lbsSuccess: {
    code: 2,
    tip: 'lbs获取成功'
  },
  lbsError: {
    code: 3,
    tip: 'lbs获取失败'
  },
  lbsFail: {
    code: 4,
    tip: 'lbs3次尝试失败'
  },
  lbsEmptyFail: {
    code: 5,
    tip: 'lbs获取为空'
  },
  localSuccess: {
    code: 6,
    tip: '启用本地服务'
  },
  sipEmpty: {
    code: 7,
    tip: '可用服务取空'
  },
  sipInit: {
    code: 8,
    tip: 'SIP服务连接中'
  },
}

const QiyuConfig = {
  web_rtc_protocol: window.location.href.startsWith("https") ? 'wss' : 'ws',
  sip_protocol: 'sip:',
  sip_url: '@cc.qiyukf.com'
};

const callUser = get(window,'setting.callUser',{});
const user = get(window,'setting.user',{});

const uri = `${QiyuConfig.sip_protocol}${callUser.username}${QiyuConfig.sip_url}`

const loginConfig = {
  url: '',
  ua: {
    uri,
    password: callUser.password,
    session_timers: false,
    register_expires: 100,
    // connection_recovery_min_interval: 1, // 重连最小周期
    connection_recovery_max_interval: 4, // 重连最大周期
    contact_uri: `${uri};transport=${QiyuConfig.web_rtc_protocol}`
  },
  // TODO 七鱼呼叫中心代理事件对接
  callback(){},
  extraHeaders: [`App-ID: ${callUser.appId}`]
};

// @ts-ignore
const debugSipServer = window.debug('callcenter:sipserver');

class SIPServer {
  lbsGetting: boolean;
  lbsRetryCount: number;  // 重试次数
  lbsServerList: Array<any>; // lbs 列表
  localServerList: Array<any>; // 本地列表
  serverListFrom: number; // 0-本地 1-异步lbs
  serverList: Array<any>; // 使用中的服务列表
  availableServerList: Array<any>;  // 使用中的可用的服务列表
  selectType: number; // 用哪种规则选取服务 0-顺序 1-随机
  lbsError: boolean;  // SIP代理状态
  serverEmpty: boolean;  // 服务是否取空，lbs与本地均无可用服务
  status: ICodeTip; // 0-准备中 1-lbs获取错误 2-lbs首次加载3次重试错误 3-lbs取空后获取错误 4-本地取空
  selectedIndex: number;  // 当顺序选择时记录选中下标, 默认-1
  isWorking: boolean;
  loginServerTimer: any;
  getSipServerTimer: any;
  sdkType: string;
  sdk: any;
  loginStatus: ICodeTip;
  sipUrl: string;
  sipAdaptor: SIPAdaptor;
  session: any;

  constructor({sdkType,sdk,sipAdaptor}:{
    sdkType: string,
    sdk: any,
    sipAdaptor: SIPAdaptor;
  }){
    this.lbsGetting = false; 
    this.lbsRetryCount = 0;
    this.lbsServerList = [];  
    this.localServerList = []; 
    this.serverListFrom = 1;
    this.serverList = [];
    this.availableServerList = [];
    this.selectType = 0;
    this.lbsError = false; 
    this.serverEmpty = false;
    this.status = sipServerStatusMap.init;
    this.selectedIndex = -1;
    this.isWorking = true;
    this.loginServerTimer=null;
    this.getSipServerTimer=null;
    this.sdkType = sdkType;
    this.sdk = sdk;
    this.loginStatus = loginStatusMap.init;
    this.sipUrl = '';
    this.sipAdaptor = sipAdaptor;
    this.session = null
  }

  // 初始化SIP代理
  init(){
    this.loginServerTimer && clearTimeout(this.loginServerTimer);
    this.isWorking = true;
    this.sdk.ua && this.sdk.ua.stop();

    // 连续尝试3次（页面加载3次，状态切换3次）则取本地服务列表
    // 无获取错误 || 获取有错切非获取中
    if(!this.lbsError || (this.lbsError && !this.lbsGetting) ) {
      this.log("可用服务初始选取中");
      this.notify(false, { codeTip: sipServerStatusMap.init});
      this.getLBSServer();
    }
  }

  // 获取可用lbs服务列表
  async getLBSServer(){
    this.log("可用服务重新选取中");
    this.loginStatus = loginStatusMap.getting;
    this.lbsGetting = true;
    const res = await getSIPList();
    this.lbsGetting = false;
    handleRes(res,(data:any)=>{
      // lbs方案信息
      let codeTip:ICodeTip = sipServerStatusMap.init;
      let proxy:object = {};
      const hasError = !Boolean(get(data,'proxy.upstream',[]).length);

      if(hasError){
        codeTip = sipServerStatusMap.lbsEmptyFail;
      } else {
        codeTip = sipServerStatusMap.lbsSuccess;
        proxy = data.proxy;
      }

      const options:IServerOptions = {
        codeTip,
        proxy,
      };
      this.onSIPServer(hasError, options);

      // turn媒体中转服务配置
      const turnList = get(data,'turn',[]);
      this.sipAdaptor.rtcConfig = turnList.length ? {
        iceServers: turnList,
        iceTransportPolicy: 'relay'
      } : null

      return true
      },(error:any)=>{
        this.onSIPServer(true, { codeTip: sipServerStatusMap.lbsError, options: {}, error});
        return true
      })
  }

  notify(hasError:boolean,options:{codeTip:ICodeTip}){
    // @ts-ignore
    window.debug('[init SipServer] %O', {
      error: hasError,
      options: {
        code: options.codeTip.code,
        cause: options.codeTip.tip
      }
    });
    this.sipAdaptor.status = sipAdaptorStatusMap.initializeFail;
    this.lbsError = hasError;
    this.status = options.codeTip;
  }

  log(message:string,data?:any){
    message = `${new Date().toLocaleTimeString()} ${message}`;
    debugSipServer(message, data)
  }

  formatServerList(sipServer:any = {}, from:number) {
    this.serverListFrom = from;
    this.lbsGetting = false;
    this.retryClean();
    this.selectType = get(sipServer, 'strategy', 0);
    let serverList = get(sipServer, 'upstream', []);
    if(from) {
      this.lbsServerList = serverList;  
    } else {
      // 打乱顺序
      serverList = get(serverList,'length',0) ? serverList.sort(() => {
        const random = Math.random();
        if (random > 0.5 ) {
          return -1;
        } else if (random < 0.5 ) {
          return 1;
        } else {
          return 0;
        }
      }) : serverList;;
      this.localServerList = serverList;
    }
    this.serverList = serverList;
    this.availableServerList = serverList;

    return serverList;
  }

  retryClean(){
    this.serverList=[];
    this.lbsRetryCount = 0;
    this.selectedIndex = -1;
  }

  onSIPServer(hasError:boolean, data:IServerOptions){
    let {codeTip} = data;
    clearTimeout(this.getSipServerTimer);
    this.log("LBS获取结果 %O", data);
    if(hasError) {
      if(this.lbsRetryCount < 2) {
        this.lbsRetryCount++;
        this.log(`LBS获取失败重试第${this.lbsRetryCount}次`);
        this.getSipServerTimer = setTimeout(()=>{
          this.getLBSServer();
        }, 1000);
      } else {
        const sipServer:object = get(window, 'qiyuConnect.sipServer', {});
        this.formatServerList(sipServer, 0);
        this.log("使用本地列表 %O", sipServer);
        if(this.availableServerList.length) {
          codeTip = sipServerStatusMap.localSuccess;
          this.loginServer();
        } else {
          codeTip = sipServerStatusMap.lbsFail;
        }
      }
    } else {
      this.formatServerList(data.proxy, 1);
      this.loginServer();
    }
    this.notify(hasError, { codeTip });
  }

  loginServer(){
    this.sipUrl = '';
    const proxy = this.selectServer();
    if(proxy && this.loginStatus !== loginStatusMap.init) {
      this.loginStatus = loginStatusMap.connecting;
      const initConfig = {
        ...loginConfig,
        url: `${QiyuConfig.web_rtc_protocol}://${proxy}`
      };
      this.sdk.login(initConfig);
      const sipUrl = (this.serverListFrom ? 'LBS ': '本地 ')+ initConfig.url;
      this.log("UA初始化 " + sipUrl);
      this.sipUrl = sipUrl;
      this.notify(false, { codeTip: sipServerStatusMap.sipInit });
    }
  }

  // 获取可用服务LBS 
  // selectType 0 顺序 1 权重随机
  selectServer(){
    this.loginStatus = loginStatusMap.selecting;
    let proxy;
    // 取空
    if(!this.availableServerList.length) {
      this.log("可用服务取空 重新获取");
      this.retryClean();
      this.serverEmpty = true;
      this.notify(true, { codeTip: sipServerStatusMap.sipEmpty });
      clearTimeout(this.getSipServerTimer);
      this.getSipServerTimer = setTimeout(()=>{
        this.getLBSServer();
      }, 1000);
    } else {
      this.selectedIndex++;
      const {serverList} = this;
      if(get(serverList,'length',0)) {
        proxy = serverList[this.selectedIndex]
        this.availableServerList = serverList.slice(this.selectedIndex+1);
        this.log(`选取可用服务 第${this.selectedIndex}个 %O`, proxy);
      } else {
        // 可用列表为空
        this.onSIPServer(true, {codeTip: sipServerStatusMap.lbsEmptyFail}); 
        this.log("无可用服务选取");
      }
    }
    return proxy ? `${proxy.host}:${proxy.port}` : null;
  }
}

// TODO cefQuery
// @ts-ignore
window.cefQuery = true;

// @ts-ignore
const inPC = window.cefQuery;

class SIPAdaptor {
  status:ICodeTip;
  sipServer:SIPServer;
  eventCallbackMap:Common.IObject<Function>;
  forceStop:boolean;  // 强制停止连接
  rtcConfig: IRTCConfig | null;

  constructor() {
    this.status = sipAdaptorStatusMap.initializing;
    this.sipServer = new SIPServer({
      sdkType: 'qiyu',
      // @ts-ignore
      sdk: window.QiyuConnect,
      sipAdaptor: this
    });
    this.eventCallbackMap={};
    this.forceStop=false;
    this.rtcConfig=null;
  }

  init() {
    // 如果是PC端，通过PC接口检测权限
    if (inPC) {
      if (!window.location.href.startsWith('https')) {
        this.status = sipAdaptorStatusMap.unsafe;
        return;
      }
      // TODO _nativeApi
      // @ts-ignore
      // window._nativeApi.detectAudioDevice();
    } else {
      try {
        navigator.mediaDevices
          .getUserMedia({
            audio: true,
          })
          .then(() => {
            this.sipServer.init();
          })
          .catch((error) => {
            // @ts-ignore
            window.debug('getUserMediaError %O', error);
            switch (error.name) {
              case 'NotAllowedError':
                this.status = sipAdaptorStatusMap.microphoneDisabled;
                break;
              case 'NotFoundError' || 'DevicesNotFoundError':
                this.status = sipAdaptorStatusMap.microphoneNotFount;
                break;
              case 'NotSupportedError':
                this.status = sipAdaptorStatusMap.unsafe;
                break;
              default:
            }
            this.dispatchEvent('mediaError', {
              type: 'init',
              error,
              status: this.status,
            });
          });
      } catch (error) {
        console.log(error);
        if (!window.location.protocol.startsWith('https:')) {
          this.status = sipAdaptorStatusMap.unsafe;
        }
        this.dispatchEvent('mediaError', {
          type: 'initError',
          error,
          status: this.status,
        });
      }
    }
  }

  callSIPServer(methodName:string){
    const {session,sdk} = this.sipServer
    const method = sdk[methodName];
    if(method && session){
      method(session)
    }
  }

  accept () {
    // 卡思、微店等，在接起时获取媒体设备，如果没有返回，增加重试机制
    const someCode = [
      '7','ipcc1213','gamesbluebc','wmccs','yimutian','7daichina','5050sgmw','siji','bluebc',
      'wxyjxxkjyxgs','wd0090' 
    ];

    // @ts-ignore
    window.debug('accept corpCode:%s', user.corpCode);

    const answerOptions:IAnswerOptions = {
      mediaConstraints: {
        audio: true,
        video: false
      },
      pcConfig: null
    };
    this.rtcConfig && (answerOptions.pcConfig = this.rtcConfig);

    if (someCode.includes(user.corpCode)) {
      this.retry(0,false,answerOptions);
    } else {
      const {session,sdk}=this.sipServer;
      session && sdk.answer(session, answerOptions);
    }
  };

  retry (retryCount:number=0,hasAccept:boolean=false,answerOptions:IAnswerOptions) {
    retryCount+=1;
    let timer:NodeJS.Timeout|null = null;

    // @ts-ignore
    window.debug('retry retryCount:%d', retryCount);

    //重试次数小于3次时，起一个定时器，如果navigator.mediaDevices.getUserMedia没有返回，定时器触发重试
    if (retryCount < 3) {
      timer = setTimeout(()=>{
        this.retry(retryCount,hasAccept,answerOptions)
      }, 200);
    }
      
    try{
      window.navigator.mediaDevices.getUserMedia({audio: true, video: false}).then((stream) => {
        clearTimeout(timer as NodeJS.Timeout);
        
        // @ts-ignore
        window.debug('getUserMedia success hasAccept:%d', Number(hasAccept));

        if(!hasAccept){
          //防止多次调用：如果navigator.mediaDevices.getUserMedia返回就是很慢，三次重试过了，然后同时返回成功，此时防止接起多次
          answerOptions.mediaStream = stream;
          const {session,sdk}=this.sipServer;
          session && sdk.answer(session, answerOptions);
          hasAccept = true;
        }
      }).catch((error) => {
        // @ts-ignore
        window.debug('getUserMedia failed %O', error);
        this.dispatchEvent('mediaError', { type: "accept", error, status: this.status, retryCount});
      });
    }catch(error){
      console.log(error);
      this.dispatchEvent('mediaError', { type: "acceptError", error, status: this.status, retryCount});
    }
  }

  // autoSwitch 用户是否手动变更状态
  connect (autoSwitch:boolean, options:{
    from: string
    status: number
    preset: number
  }) {
    this.forceStop = false;
    const {sipServer} = this;
    sipServer.log(`${options.from}【%s】切状态 当前-${seatStatusMap[options.status].text} 预设-${seatStatusMap[options.preset].text}`, autoSwitch? "手动": "系统");
    sipServer.log("当前代理及连接状态: %O", {
      ua: this.status.tip,
      ws: sipServer.loginStatus.tip,
      sipretry: sipServer.isWorking,
      sip: sipServer.status.tip
    });
    if(this.status === sipAdaptorStatusMap.initFail){
      const isCalling = callUser.status === 3;
      const uaConnected = [loginStatusMap.error, loginStatusMap.success].includes(sipServer.loginStatus);
      if(isCalling || uaConnected) {
        const ua = get(sipServer,'sdk.ua',null);
        ua && ua.start();
        sipServer.log("尝试重连，原代理 %O ", ua);
      } else{
        if(!sipServer.isWorking || (sipServer.isWorking && ![loginStatusMap.getting, loginStatusMap.connecting].includes(sipServer.loginStatus))) {
          sipServer.init();
          sipServer.log("重置之前失败结果，重新初始化 %O ", sipServer.sdk.ua);
        } else {
          sipServer.log("重置之前失败结果，重新初始化中 %O", sipServer.sdk.ua);
        }
      }
    }
    // @ts-ignore
    window.debug('connect %s', getStackTrace());
  };

  disConnect () {
    const {sdk} = this.sipServer
    sdk.ua && sdk.ua.stop();
    this.sipServer.isWorking = false;
    this.forceStop = true;
    // @ts-ignore
    window.debug('disConnect %s', getStackTrace());
  }

  addEventListener(event:string, callback:Function, scope:object) {
    this.eventCallbackMap[event] = callback.bind(scope)
  };

  dispatchEvent(event:string, options:any){
    const eventCallback = this.eventCallbackMap[event]
    if (getType(eventCallback) === 'function') {
      // @ts-ignore
      window.debug('dispatchEvent %s %O', event, options);
      eventCallback(event, options);
    }
  }

  notifyQiyu(type, data) {
    debug('[notifyQiyu] type:%s, data:%O', type, data);
    switch (type) {
        case 'registered':
            p.status = ERROR_TYPE.SUCCESS;
            break;
        case 'unregistered':
            p.status = ERROR_TYPE.INIT_FAIL;
            break;
        case 'registrationFailed':
            p.status = ERROR_TYPE.INIT_FAIL;

            // 连接状态  请求超时pending、响应超时 408、410、420、480  UNAVAILABLE 
            var ua = adaptor.sdk.ua;
            var isResistered = ua.isRegistered(); // 是否有注册成功过
            var isConnected = ua.isConnected();

            debug('[registrationFailed] %O', {
                code: data.code,
                error: data.error,
                reason: data.cause,
                isConnected: isConnected,
                isRegistered: isResistered,
                uaStatus: ua.status,
                ua: ua
                // socket: data.socket
            });
            sipServer.log('ws服务注册失败');
            /* 连接状态 请求超时 */
            var isResponseTimeout = data.cause && data.cause === 'UNAVAILABLE';
            var isRequestTimeout = data.cause && data.cause === 'Request Timeout';
            var isConnectTimeOut = isRequestTimeout || isResponseTimeout;
            // 若是响应超时避免服务器集结压力过大做时间缓冲, 区间为5s
            var isValidRegister = !this.timestampRegister || (Math.abs(Date.now() - this.timestampRegister)/1000 > 5);
            if(isConnected && isConnectTimeOut && isValidRegister ) {
                p.loginStatus = LOGIN_STATUS.CODE.ERROR;
                this.timestampRegister = Date.now();
                sipServer.log('ws服务注册失败-重试');
                ua.register();// 未注册成功过 或 注册成功过isResistered 则关闭 一个周期仅触发一次 ua.registered  ua.registrator.close();
            } else {
                var isConnectError = data.cause && data.cause === 'Connection Error';
                this.uaConnectError = isConnectError;
                sipServer.log('ws服务注册失败-重连 连接错误 %s', this.uaConnectError);
            }
            break;
        case 'connected':
            this.connected = true;
            this.reconnect = 0;
            this.callingReconnect = false;
            sipServer.log('ws服务连接成功');
            p.loginStatus = LOGIN_STATUS.CODE.SUCCESS;
            sipServer.nofity(false, { code: sipServerInfo.Code.SIP_SUCCESS});
            break;
        case 'disconnected':
            data = data || {};
            var ua = adaptor.sdk.ua,
                errorInfo = data.error || {},
                hasError = errorInfo.error;
            debug('[disconnected] %O', {
                error: errorInfo,
                isConnected: ua.isConnected(),
                status: ua.status,
                ua: ua,
                socket: data.socket
            });
            p.status = ERROR_TYPE.INIT_FAIL;

            function cleanReconnectFlag() {
                this.reconnect = 0;
                this.callingReconnect = 0;
                this.uaConnectError = 0;
            }
            // 非强制关闭的情况下出现连接错误
            if(hasError) {
                sipServer.log('ws服务 异常断开  代理状态 %s', ERROR_MSG[p.status]);
                try {
                    // 1、通话状态下连接失败，一直尝试重连, 若电话结束未成功直接切换地址 isCalling = window.setting.callUser.status == 3
                    if(window.setting.callUser.status == 3) {
                        p.loginStatus = LOGIN_STATUS.CODE.FAIL;
                        //重注重连v1: ①若连接成功过之后未连接成功  ②uaConnectError 避免重复执行 ③ 避免服务器高并发请求集结做缓冲
                        var isValidConnect = !this.timestampConnect || (Math.abs(Date.now() - this.timestampConnect) > 1000);
                        sipServer.log('ws连接服务【通话中】注册失败 %O', sipServer.sipUrl);
                        if(this.uaConnectError&&isValidConnect) {
                            this.timestampConnect = Date.now();
                            ua.start();
                            this.callingReconnect = true;
                            sipServer.log('ws【通话中】尝试重连中');
                        }
                    } else {
                    // 2、非通话状态下连接失败，走LBS 方案，尝试更换 SIP 服务策略
                        // 2.1 注册失败场景：注册失败场景下
                        if(this.uaConnectError && this.connected) {
                            sipServer.log('ws连接服务注册失败 %O', sipServer.sipUrl);
                            var isValidConnect = !this.timestampConnect || (Math.abs(Date.now() - this.timestampConnect) > 1000);
                            // 当事件时差>1s时，做处理
                            if(isValidConnect) {
                                this.reconnect = this.reconnect || 0;
                                this.reconnect++;
                                // 通话中未重连成功或非通话重连3次未成功
                                if(this.reconnect > 3 || this.callingReconnect == true) {
                                    sipServer.log( "ws放弃重连更换地址 "+(this.callingReconnect ? '【通话中】' : ''));
                                    this.connected = 0;
                                    cleanReconnectFlag();
                                    ua.stop();
                                    sipServer.loginServer();
                                    p.loginStatus = LOGIN_STATUS.CODE.FAIL;
                                } else {
                                    p.loginStatus = LOGIN_STATUS.CODE.ERROR;
                                    this.timestampConnect = Date.now();
                                    ua.start();
                                    sipServer.log('ws第'+this.reconnect+'次尝试重连中');
                                }
                            }
                        } else {
                            // 2.2 其他失败场景
                            ua.stop();
                            p.loginStatus = LOGIN_STATUS.CODE.FAIL;
                            sipServer.log('ws地址连接失败 %O', sipServer.sipUrl);
                            p.loginServerTimer && clearTimeout(p.loginServerTimer);
                            p.loginServerTimer = setTimeout( function() {
                                sipServer.log('ws地址连接失败 代理及连接状态 %O', { adaptor: ERROR_MSG[p.status], ws: LOGIN_STATUS.MSG[p.loginStatus] });
                                if(p.loginStatus == LOGIN_STATUS.CODE.FAIL) {
                                    sipServer.log('ws地址连接失败 更换地址重试');
                                    sipServer.loginServer();
                                }
                            }, 1000);
                        }
                    }
                } catch (e) {
                    console.log('disconnect error');
                }
            } else {
                // 正常断开清除重连标识
                cleanReconnectFlag();
                if(this.forceStop) {
                    p.loginServerTimer && clearTimeout(p.loginServerTimer);
                }
                sipServer.log('ws服务断开 代理及连接状态 %O', { adaptor: ERROR_MSG[p.status], ws: LOGIN_STATUS.MSG[p.loginStatus] });
            }

            break;
        case 'newRTCSession':
            if (data.originator === 'local') return;

            var session = data.session;

            // Avoid if busy or other incoming
            if (adaptor.session) {

                debug('[terminate] %O', {
                    status_code: 486,
                    reason_phrase: 'Busy Here',
                    session: adaptor.session
                });

                session.terminate({
                    status_code: 486,
                    reason_phrase: 'Busy Here'
                });
                return;
            }

            adaptor.session = session;

            p.fireEvent('ringing', {
                type: data.request.hasHeader('Direction-Type') ? Number(data.request.getHeader('Direction-Type')) : 1
            });

            session.on('accepted', function() {

                var nodePhone;
                if (window.document && (nodePhone = window.document.getElementById('qiyuPhone'))) {
                    // Display remote stream
                    nodePhone.srcObject = session.connection.getRemoteStreams()[0];
                }
                stats.startStats(session.connection);
            });
            session.on('ended', function() {

                debug('jssip:ended');

                stats.stopStats();
                adaptor.session = null;
            });
            session.on('failed', function() {

                debug('jssip:failed');

                stats.stopStats();
                adaptor.session = null;
            });

            break;
        default:
            break;
    }
}
}

export const sipAdaptor = new SIPAdaptor();
