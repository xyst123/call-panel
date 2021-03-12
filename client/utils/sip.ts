import { seatStatusMap, PhoneStatus } from '@/constant/phone';
import { get, getType, getStackTrace, shuffle, getDebug } from '@/utils';
import { getSIPList } from '@/service/sip';
import { setting } from '@/constant/outer';

const sipDebug = getDebug('sipserver');
const adaptorDebug = getDebug('sipserver');

interface IServerOptions {
  codeTip: ICodeTip,
  proxy?: object,
  options?: object,
  error?: any
}

interface ICodeTip {
  code: number,
  tip: string
}

interface IRTCConfig {
  iceServers: Array<any>,
  iceTransportPolicy: string
}

interface IAnswerOptions {
  mediaConstraints: {
    audio: boolean,
    video: boolean
  }
  pcConfig: IRTCConfig | null;
  mediaStream?: MediaStream
}

const loginStatusMap: {
  [key: string]: ICodeTip
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

const sipServerStatusMap: {
  [key: string]: ICodeTip
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

const sipAdaptorStatusMap: {
  [key: string]: ICodeTip
} = {
  success: {
    code: 0,
    tip: ''
  },
  initializing: {
    code: 1,
    tip: '电话功能尚未初始化完成，请刷新或稍后重试！'
  },
  initializeFail: {
    code: 2,
    tip: '电话功能初始化失败，请刷新或稍后重试!'
  },
  microphoneNotFount: {
    code: 3,
    tip: '未找到可用的麦克风，请检查麦克风设置并刷新页面重试'
  },
  microphoneDisabled: {
    code: 4,
    tip: '麦克风被禁用，请检查麦克风设置并刷新页面重试'
  },
  unsafe: {
    code: 5,
    tip: '非安全模式不允许使用音频，请切换成HTTPS方式登录后使用'
  },
  connectingNotReady: {
    code: 6,
    tip: '电话功能尚未初始化完成，正在努力工作中，请刷新或稍后重试!'
  },
}

const QiyuConfig = {
  web_rtc_protocol: window.location.href.startsWith("https") ? 'wss' : 'ws',
  sip_protocol: 'sip:',
  sip_url: '@cc.qiyukf.com'
};

const callUser = get(setting, 'callUser', {});
const user = get(setting, 'user', {});

class SIPServer {
  status: ICodeTip; // 0-准备中 1-lbs获取错误 2-lbs首次加载3次重试错误 3-lbs取空后获取错误 4-本地取空
  isWorking: boolean;
  sdk: any;
  loginStatus: ICodeTip;
  session: any;

  private lbsGetting: boolean;
  private lbsRetryCount: number;  // 重试次数
  private lbsServerList: Array<any>; // lbs 列表
  private localServerList: Array<any>; // 本地列表
  private serverListFrom: number; // 0-本地 1-异步lbs
  private serverList: Array<any>; // 使用中的服务列表
  private availableServerList: Array<any>;  // 使用中的可用的服务列表
  private selectType: number; // 用哪种规则选取服务 0-顺序 1-随机
  private lbsError: boolean;  // SIP代理状态
  private serverEmpty: boolean;  // 服务是否取空，lbs与本地均无可用服务
  private sdkType: string;
  private selectedIndex: number;  // 当顺序选择时记录选中下标, 默认-1
  private sipUrl: string;
  private sipAdaptor: SIPAdaptor;
  private loginServerTimer: any;
  private timestampRegister: number;
  private uaConnectError: boolean;
  private connected: boolean;
  private reconnect: number;
  private callingReconnect: boolean;
  private timestampConnect: number;
  private debugWebRTC: any;
  private debugWebRTCCount: number;

  constructor({ sdkType, sdk, sipAdaptor }: {
    sdkType: string,
    sdk: any,
    sipAdaptor: SIPAdaptor;
  }) {
    this.status = sipServerStatusMap.init;
    this.isWorking = true;
    this.sdk = sdk;
    this.loginStatus = loginStatusMap.init;
    this.session = null;

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
    this.sdkType = sdkType;
    this.selectedIndex = -1;
    this.sipUrl = '';
    this.sipAdaptor = sipAdaptor;
    this.loginServerTimer = null;
    this.timestampRegister = 0;
    this.uaConnectError = false;
    this.connected = false;
    this.reconnect = 0;
    this.callingReconnect = false;
    this.timestampConnect = 0;
    this.debugWebRTC = null;
    this.debugWebRTCCount = 0;
  }

  // 初始化SIP代理
  async init() {
    this.loginServerTimer && clearTimeout(this.loginServerTimer);
    this.isWorking = true;
    this.sdk.ua && this.sdk.ua.stop();

    // 连续尝试3次（页面加载3次，状态切换3次）则取本地服务列表
    // 无获取错误 || 获取有错切非获取中
    if (!this.lbsError || (this.lbsError && !this.lbsGetting)) {
      this.log("可用服务初始选取中");
      this.notify(false, { codeTip: sipServerStatusMap.init });
      this.handleConnect();
    }
  }

  private async handleConnect() {
    const shouldLoginServer = await this.getLBSServerRetry();
    if (shouldLoginServer) {
      this.loginServer()
    }
  }

  // 获取可用lbs服务列表失败则重试，重试三次依然失败则使用本地数据
  private async getLBSServerRetry(): Promise<boolean> {
    const { hasError, codeTip, proxy } = await this.getLBSServer();
    this.log("LBS获取结果 %O", {
      codeTip,
      proxy
    });

    if (!hasError) {
      this.getAvailableServerList(proxy, 1);
      this.notify(hasError, { codeTip });
      return true
    }

    if (this.lbsRetryCount >= 3) {
      const sipServer: object = get(window, 'qiyuConnect.sipServer', {});
      this.getAvailableServerList(sipServer, 0)
      this.log("使用本地列表 %O", sipServer);
      const shouldLoginServer = this.availableServerList.length > 0;
      this.notify(hasError, { codeTip: sipServerStatusMap[shouldLoginServer ? 'localSuccess' : 'lbsFail'] });
      return shouldLoginServer
    }

    this.lbsRetryCount++;
    this.log(`LBS获取失败重试第${this.lbsRetryCount}次`);
    this.notify(hasError, { codeTip });
    return this.getLBSServerRetry();
  }

  // 获取可用lbs服务列表
  private async getLBSServer() {
    this.log("可用服务选取中");
    this.loginStatus = loginStatusMap.getting;

    this.lbsGetting = true;
    const res = await getSIPList();
    this.lbsGetting = false;

    let hasError = false, codeTip: ICodeTip, proxy: object = {};
    const { status, data } = res;
    if (status) {
      hasError = !Boolean(get(data, 'proxy.upstream', []).length);
      if (hasError) {
        codeTip = sipServerStatusMap.lbsEmptyFail;
      } else {
        codeTip = sipServerStatusMap.lbsSuccess;
        proxy = data.proxy;
      }

      // turn媒体中转服务配置
      const turnList = get(data, 'turn', []) || [];
      this.sipAdaptor.rtcConfig = turnList.length ? {
        iceServers: turnList,
        iceTransportPolicy: 'relay'
      } : null
    } else {
      codeTip = sipServerStatusMap.lbsError
    }

    return {
      hasError,
      codeTip,
      proxy,
    }
  }

  // 获取 availableServerList
  private getAvailableServerList(sipServer: any = {}, from: number) {
    this.serverListFrom = from;
    this.lbsGetting = false;
    this.retryClean();
    this.selectType = get(sipServer, 'strategy', 0);
    let serverList = get(sipServer, 'upstream', []);
    if (from) {
      this.lbsServerList = serverList;
    } else {
      serverList = shuffle(serverList);
      this.localServerList = serverList;
    }
    this.serverList = serverList;
    this.availableServerList = serverList;
    return serverList;
  }

  log(message: string, data?: any) {
    message = `${new Date().toLocaleTimeString()} ${message}`;
    sipDebug(message, data)
  }

  private notify(hasError: boolean, options: { codeTip: ICodeTip }) {
    const { codeTip } = options;
    adaptorDebug('[init SipServer] %O', {
      error: hasError,
      options: {
        code: codeTip.code,
        cause: codeTip.tip
      }
    });
    this.status = codeTip;
    this.lbsError = hasError;
    this.sipAdaptor.status = sipAdaptorStatusMap.initializeFail;
  }

  private startStats(peer: any) {
    if (!peer) return;

    const debugStats = this.sdk.debug('QiyuConnect:Stats');
    const DebugWebRTC = this.sdk.DebugWebRTC;

    this.debugWebRTC = new DebugWebRTC({
      peer,
      interval: 1000
    });

    this.debugWebRTC.on(DebugWebRTC.PARSERS.PARSER_CHECK_AUDIO_TRACKS, (audio: any) => {
      debugStats('audio data: %j', audio);
      if (audio.send.availableBandwidth === '0.0') this.debugWebRTCCount++;
      if (this.debugWebRTCCount === 10) {
        debugStats('audio data: warning');
      }
    });

    this.debugWebRTC.on(DebugWebRTC.PARSERS.PARSER_GET_CONNECTION, (connection: any) => {
      debugStats('connection data: %j', connection);
    });

    this.debugWebRTC.on(DebugWebRTC.PARSERS.PARSER_GET_STREAMS, (stream: any) => {
      debugStats('stream data: %j', stream);
      this.sipAdaptor.dispatchEvent('jitterBuffer', {
        jitterBuffer: stream.audio.recv.googJitterBufferMs
      });
    });

    this.debugWebRTC.on(DebugWebRTC.TYPES.TYPE_ALL, (results: any) => {
      this.sdk.debug('QiyuConnect:Stats:ALL')('all data: %j', results);
    });
  }

  private stopStats() {
    if (this.debugWebRTC) {
      this.debugWebRTC.destroy();
      this.debugWebRTC = null;
      this.debugWebRTCCount = 0;
      this.sipAdaptor.dispatchEvent('jitterBuffer', {
        jitterBuffer: 0
      })
    }
  }

  private loginServer() {
    this.sipUrl = '';
    const proxy = this.selectServer();
    if (proxy && this.loginStatus !== loginStatusMap.init) {
      this.loginStatus = loginStatusMap.connecting;
      const sipServer = this;
      const { sipAdaptor } = sipServer;
      const url = `${QiyuConfig.web_rtc_protocol}://${proxy}`;
      const uri = `${QiyuConfig.sip_protocol}${callUser.username}${QiyuConfig.sip_url}`
      this.sdk.login({
        ua: {
          uri,
          password: callUser.password,
          session_timers: false,
          register_expires: 100,
          // connection_recovery_min_interval: 1, // 重连最小周期
          connection_recovery_max_interval: 4, // 重连最大周期
          contact_uri: `${uri};transport=${QiyuConfig.web_rtc_protocol}`
        },
        extraHeaders: [`App-ID: ${callUser.appId}`],
        url,
        callback(type: string, data: any = {}) {
          adaptorDebug('[notifyQiyu] type:%s, data:%O', type, data);
          const { ua: sdkUA } = sipServer.sdk;
          switch (type) {
            case 'registered':
              sipAdaptor.status = sipAdaptorStatusMap.success;
              break;
            case 'unregistered':
              sipAdaptor.status = sipAdaptorStatusMap.initializeFail;
              break;
            case 'registrationFailed':
              sipAdaptor.status = sipAdaptorStatusMap.initializeFail;
              const isConnected = sdkUA.isConnected();
              const isRegistered = sdkUA.isRegistered();
              adaptorDebug('[registrationFailed] %O', {
                code: data.code,
                error: data.error,
                reason: data.cause,
                isConnected,
                isRegistered,
                uaStatus: sdkUA.status,
                ua: sdkUA
                // socket: data.socket
              });
              sipServer.log('ws服务注册失败');
              const cause = get(data, 'cause', '');
              // 连接状态 请求超时
              const isResponseTimeout = cause === 'UNAVAILABLE';
              const isRequestTimeout = cause === 'Request Timeout';
              const isConnectTimeOut = isRequestTimeout || isResponseTimeout;
              // 若是响应超时避免服务器集结压力过大做时间缓冲, 区间为5s
              const isValidRegister = !sipServer.timestampRegister || (Math.abs(Date.now() - sipServer.timestampRegister) / 1000 > 5);
              if (isConnected && isConnectTimeOut && isValidRegister) {
                sipServer.loginStatus = loginStatusMap.error;
                sipServer.timestampRegister = Date.now();
                sipServer.log('ws服务注册失败-重试');
                sdkUA.register();
              } else {
                sipServer.uaConnectError = cause === 'Connection Error';
                sipServer.log('ws服务注册失败-重连 连接错误 %s', sipServer.uaConnectError);
              }
              break;
            case 'connected':
              sipServer.connected = true;
              sipServer.reconnect = 0;
              sipServer.callingReconnect = false;
              sipServer.log('ws服务连接成功');
              sipServer.loginStatus = loginStatusMap.success;
              sipServer.notify(false, { codeTip: sipServerStatusMap.sipSuccess });
              break;
            case 'disconnected':
              const errorInfo = get(data, 'error', { error: false });
              const { error: hasError } = errorInfo;
              adaptorDebug('[disconnected] %O', {
                error: errorInfo,
                isConnected: sdkUA.isConnected(),
                status: sdkUA.status,
                ua: sdkUA,
                socket: data.socket
              });
              sipAdaptor.status = sipAdaptorStatusMap.initializeFail;

              // 非强制关闭的情况下出现连接错误
              if (hasError) {
                sipServer.log('ws服务 异常断开  代理状态 %s', sipAdaptor.status.tip);
                try {
                  // 1、通话状态下连接失败，一直尝试重连，若电话结束未成功直接切换地址 isCalling = window.setting.callUser.status === 3
                  if (callUser.status === PhoneStatus.calling) {
                    sipAdaptor.status === loginStatusMap.fail;
                    const isValidConnect = !sipServer.timestampConnect || (Math.abs(Date.now() - sipServer.timestampConnect) > 1000);
                    sipServer.log('ws连接服务【通话中】注册失败 %O', sipServer.sipUrl);
                    if (sipServer.uaConnectError && isValidConnect) {
                      sipServer.timestampConnect = Date.now();
                      sdkUA.start();
                      sipServer.callingReconnect = true;
                      sipServer.log('ws【通话中】尝试重连中');
                    }
                  } else {
                    // 2、非通话状态下连接失败，走 LBS 方案，尝试更换 SIP 服务策略
                    if (sipServer.uaConnectError && sipServer.connected) {
                      // 2.1 注册失败场景：注册失败场景下
                      sipServer.log('ws连接服务注册失败 %O', sipServer.sipUrl);
                      const isValidConnect = !sipServer.timestampConnect || (Math.abs(Date.now() - sipServer.timestampConnect) > 1000);
                      // 当事件时差>1s时，做处理
                      if (isValidConnect) {
                        sipServer.reconnect++;
                        // 通话中未重连成功或非通话重连3次未成功
                        if (sipServer.reconnect > 3 || sipServer.callingReconnect === true) {
                          sipServer.log(`ws放弃重连更换地址 ${sipServer.callingReconnect ? '【通话中】' : ''}`);
                          sipServer.connected = false;
                          sipServer.cleanReconnectFlag();
                          sdkUA.stop();
                          sipServer.loginServer();
                          sipServer.loginStatus = loginStatusMap.fail;
                        } else {
                          sipServer.loginStatus = loginStatusMap.error;
                          sipServer.timestampConnect = Date.now();
                          sdkUA.start();
                          sipServer.log(`ws第${sipServer.reconnect}次尝试重连中`);
                        }
                      }
                    } else {
                      // 2.2 其他失败场景
                      sdkUA.stop();
                      sipServer.loginStatus = loginStatusMap.fail;
                      sipServer.log('ws地址连接失败 %O', sipServer.sipUrl);
                      sipServer.loginServerTimer && clearTimeout(sipServer.loginServerTimer);
                      sipServer.loginServerTimer = setTimeout(() => {
                        sipServer.log('ws地址连接失败 代理及连接状态 %O', { adaptor: sipAdaptor.status.tip, ws: sipServer.loginStatus.tip });
                        if (sipServer.loginStatus === loginStatusMap.fail) {
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
                sipServer.cleanReconnectFlag();
                if (sipAdaptor.forceStop) {
                  sipServer.loginServerTimer && clearTimeout(sipServer.loginServerTimer);
                }
                sipServer.log('ws服务断开 代理及连接状态 %O', { adaptor: sipAdaptor.status.tip, ws: sipServer.loginStatus.tip });
              }
              break;
            case 'newRTCSession':
              const { originator, session } = data;
              if (originator === 'local') return;
              if (sipServer.session) {
                adaptorDebug('[terminate] %O', {
                  status_code: 486,
                  reason_phrase: 'Busy Here',
                  session: sipServer.session
                });

                session.terminate({
                  status_code: 486,
                  reason_phrase: 'Busy Here'
                });

                return;
              }

              sipServer.session = session;

              sipAdaptor.dispatchEvent('ringing', {
                type: data.request.hasHeader('Direction-Type') ? Number(data.request.getHeader('Direction-Type')) : 1
              });

              session.on('accepted', () => {
                const nodePhone = window.document ? window.document.getElementById('qiyuPhone') : null;
                if (nodePhone) {
                  (nodePhone as HTMLVideoElement).srcObject = session.connection.getRemoteStreams()[0];
                }
                sipServer.startStats(session.connection);
              });

              session.on('ended', () => {
                adaptorDebug('jssip:ended');
                sipServer.stopStats();
                sipServer.session = null;
              });

              session.on('failed', () => {
                adaptorDebug('jssip:failed');
                sipServer.stopStats();
                sipServer.session = null;
              });

              break;
            default:
              break;
          }
        },
      });
      const sipUrl = (sipServer.serverListFrom ? 'LBS ' : '本地 ') + url;
      sipServer.log("UA初始化 " + sipUrl);
      sipServer.sipUrl = sipUrl;
      sipServer.notify(false, { codeTip: sipServerStatusMap.sipInit });
    }
  }

  // 获取可用服务LBS 
  // selectType 0 顺序 1 权重随机
  private selectServer() {
    this.loginStatus = loginStatusMap.selecting;
    if (!this.availableServerList.length) {
      this.log("可用服务取空 重新获取");
      this.retryClean();
      this.serverEmpty = true;
      this.notify(true, { codeTip: sipServerStatusMap.sipEmpty });
      this.handleConnect();
      return null
    }

    this.selectedIndex++;
    const { serverList } = this;
    if (get(serverList, 'length', 0)) {
      const proxy = serverList[this.selectedIndex]
      this.availableServerList = serverList.slice(this.selectedIndex + 1);
      this.log(`选取可用服务 第${this.selectedIndex}个 %O`, proxy);
      return `${proxy.host}:${proxy.port}`;
    }

    this.log("无可用服务选取");
    this.handleConnect();
    return null
  }

  private retryClean() {
    this.serverList = [];
    this.lbsRetryCount = 0;
    this.selectedIndex = -1;
  }

  private cleanReconnectFlag() {
    this.reconnect = 0;
    this.callingReconnect = false;
    this.uaConnectError = false;
  }
}

// TODO cefQuery
window.cefQuery = false;

const inPC = window.cefQuery;

class SIPAdaptor {
  status: ICodeTip;
  forceStop: boolean;  // 强制停止连接
  rtcConfig: IRTCConfig | null;
  sipServer: SIPServer;

  private eventCallbackMap: Common.IObject<(options: any) => void>;

  constructor() {
    this.status = sipAdaptorStatusMap.initializing;
    this.forceStop = false;
    this.rtcConfig = null;
    this.sipServer = new SIPServer({
      sdkType: 'qiyu',
      sdk: window.QiyuConnect,
      sipAdaptor: this
    });

    this.eventCallbackMap = {};
  }

  init() {
    // 如果是PC端，通过PC接口检测权限
    if (inPC) {
      console.log(window.location.href.startsWith('https'))
      if (!window.location.href.startsWith('https')) {
        this.status = sipAdaptorStatusMap.unsafe;
        return;
      }
      // TODO _nativeApi
      // window._nativeApi.detectAudioDevice();
    } else {
      const { mediaDevices } = window.navigator;
      if (mediaDevices) {
        mediaDevices
          .getUserMedia({
            audio: true,
          })
          .then(() => {
            this.sipServer.init();
          })
          .catch((error) => {
            adaptorDebug('getUserMediaError %O', error);
            switch (error.name) {
              case 'NotAllowedError':
                this.status = sipAdaptorStatusMap.microphoneDisabled;
                break;
              case 'DevicesNotFoundError':
              case 'NotFoundError':
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
      } else {
        if (!window.location.protocol.startsWith('https:')) {
          this.status = sipAdaptorStatusMap.unsafe;
        }
        this.dispatchEvent('mediaError', {
          type: 'initError',
          error: 'TypeError: Cannot read property getUserMedia of undefined',
          status: this.status,
        });
      }
    }
  }

  getSession() {
    return get(this, 'sipServer.session', null)
  }

  callSDK(methodName: string, options: Array<any> = []) {
    const { session, sdk } = this.sipServer
    const method = sdk[methodName];
    if (method && session) {
      method(session, ...options)
    }
  }

  accept() {
    // 卡思、微店等，在接起时获取媒体设备，如果没有返回，增加重试机制
    const someCode = [
      '7', 'ipcc1213', 'gamesbluebc', 'wmccs', 'yimutian', '7daichina', '5050sgmw', 'siji', 'bluebc',
      'wxyjxxkjyxgs', 'wd0090'
    ];

    adaptorDebug('accept corpCode:%s', user.corpCode);

    const answerOptions: IAnswerOptions = {
      mediaConstraints: {
        audio: true,
        video: false
      },
      pcConfig: null
    };
    this.rtcConfig && (answerOptions.pcConfig = this.rtcConfig);

    if (someCode.includes(user.corpCode)) {
      this.retry(0, false, answerOptions);
    } else {
      const { session, sdk } = this.sipServer;
      session && sdk.answer(session, answerOptions);
    }
  };

  // autoSwitch 用户是否手动变更状态
  connect(autoSwitch: boolean, options: {
    from: string
    status: PhoneStatus
    preset: PhoneStatus
  }) {
    this.forceStop = false;
    const { sipServer } = this;
    sipServer.log(`${options.from}【%s】切状态 当前-${seatStatusMap[options.status].text} 预设-${seatStatusMap[options.preset].text}`, autoSwitch ? "手动" : "系统");
    sipServer.log("当前代理及连接状态: %O", {
      ua: this.status.tip,
      ws: sipServer.loginStatus.tip,
      sipretry: sipServer.isWorking,
      sip: sipServer.status.tip
    });
    if (this.status === sipAdaptorStatusMap.initializeFail) {
      const isCalling = callUser.status === PhoneStatus.calling;
      const uaConnected = [loginStatusMap.error, loginStatusMap.success].includes(sipServer.loginStatus);
      if (isCalling || uaConnected) {
        const ua = get(sipServer, 'sdk.ua', null);
        ua && ua.start();
        sipServer.log("尝试重连，原代理 %O ", ua);
      } else {
        if (!sipServer.isWorking || (sipServer.isWorking && ![loginStatusMap.getting, loginStatusMap.connecting].includes(sipServer.loginStatus))) {
          sipServer.init();
          sipServer.log("重置之前失败结果，重新初始化 %O ", sipServer.sdk.ua);
        } else {
          sipServer.log("重置之前失败结果，重新初始化中 %O", sipServer.sdk.ua);
        }
      }
    }
    adaptorDebug('connect %s', getStackTrace());
  };

  disConnect() {
    const { sdk } = this.sipServer
    sdk.ua && sdk.ua.stop();
    this.sipServer.isWorking = false;
    this.forceStop = true;
    adaptorDebug('disConnect %s', getStackTrace());
  }

  addEventListener(event: string, callback: (options: any) => void, scope: object = {}) {
    this.eventCallbackMap[event] = callback.bind(scope)
  };

  dispatchEvent(event: string, options: any) {
    const eventCallback = this.eventCallbackMap[event]
    if (getType(eventCallback) === 'function') {
      adaptorDebug('dispatchEvent %s %O', event, options);
      eventCallback(options);
    }
  }

  private retry(retryCount: number = 0, hasAccept: boolean = false, answerOptions: IAnswerOptions) {
    retryCount += 1;
    let timer: NodeJS.Timeout | null = null;

    adaptorDebug('retry retryCount:%d', retryCount);

    //重试次数小于3次时，起一个定时器，如果navigator.mediaDevices.getUserMedia没有返回，定时器触发重试
    if (retryCount < 3) {
      timer = setTimeout(() => {
        this.retry(retryCount, hasAccept, answerOptions)
      }, 200);
    }

    try {
      window.navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
        clearTimeout(timer as NodeJS.Timeout);

        adaptorDebug('getUserMedia success hasAccept:%d', Number(hasAccept));

        if (!hasAccept) {
          //防止多次调用：如果navigator.mediaDevices.getUserMedia返回就是很慢，三次重试过了，然后同时返回成功，此时防止接起多次
          answerOptions.mediaStream = stream;
          const { session, sdk } = this.sipServer;
          session && sdk.answer(session, answerOptions);
          hasAccept = true;
        }
      }).catch((error) => {
        adaptorDebug('getUserMedia failed %O', error);
        this.dispatchEvent('mediaError', { type: "accept", error, status: this.status, retryCount });
      });
    } catch (error) {
      console.log(error);
      this.dispatchEvent('mediaError', { type: "acceptError", error, status: this.status, retryCount });
    }
  }
}

export const sipAdaptor = new SIPAdaptor();
