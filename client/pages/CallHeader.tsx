import React, { useState, useEffect, useCallback,useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {Select,SelectOption} from '@/components/Select';
import {PhoneMode,seatStatusMap,restStatusMap} from '@/configs/data';
import {setPhoneMode,getOutCallNumbers} from '@/service/phone';
import { get,debug,mapObject,handleRes,getStorage,setStorage } from '@/utils';
import '@/style/CallHeader.less';

const user =get(window,'setting.user',{});
const corpPermission =get(window,'corpPermission',{});
const softSelectOptions=[1,2,6,0,8];
const phoneSelectOptions=[4];
const defaultRestStatus=1;

const getNetworkLevel=(jitterBuffer:number):String=> {
  if (jitterBuffer < 100) return 'highest';
  if (jitterBuffer < 200) return 'higher';
  if (jitterBuffer < 300) return 'high';
  else return 'low';
}

const CallHeader: React.FC<any> = () => {
  const phone = useSelector((state: any) => state.phone);
  const [restStatus, setRestStatus] =useState<number>(defaultRestStatus);
  // 网络状态
  const [jitterBuffer, setJitterBuffer] =useState<number>(0);
  // 是否被踢出
  const [kickedOut, setKickedOut] =useState<boolean>(false);
  // 本机号码备选列表
  const [outCallNumbers, setOutCallNumbers] =useState<string[]>([]);
  // 是否有内部通话权限
  const [isIntercomAllowed, setIsIntercomAllowed]=useState<boolean>(get(corpPermission,'IPCC_INEER_CALL',false) && get(user,'authority.KEFU_INTERCOM_OUT',false));

  const dispatch = useDispatch();

  const callNumber=useMemo(()=>{
    if(phone.outCallRandom){
      return <><i className="iconfont icon-random" title="已开启随机外呼模式，本机号码随机生成"></i><p>随机</p></>
    } 
    if(outCallNumbers.length>1) {
      return <Select defaultValue={phone.outCallNumber} className="line-numbers" onChange={(value:string)=>{handleSetOutCallNumber(value)}}>
        {outCallNumbers.map(item=><SelectOption key={item} value={item} label={item} className={`line-numbers-item ${item===phone.outCallNumber?'line-numbers-item_selected':''}`}>
          <p>{item}</p>
          <i className="iconfont icon-check-line-regular"></i>
        </SelectOption>)}
      </Select>
    }
    if(outCallNumbers.length===1) {
      return <p>{outCallNumbers[0]}</p>
    }
    return null
  },[phone,outCallNumbers])

  const handleSetOutCallNumber=(value:string)=>{
    if(value){
      dispatch({
        type: 'PHONE_SET',
        payload: {
          outCallNumber: value
        }
      })
      setStorage('outCallNumber',value)
    }
  }

  // 切换 mode
  const handleToggleMode=async()=>{
    const targetMode = phone.mode === PhoneMode.phone ? PhoneMode.soft : PhoneMode.phone;
    const res = await setPhoneMode(targetMode);
    handleRes(res,()=>{
      dispatch({
        type: 'PHONE_SET',
        payload: {
          mode: targetMode
        }
      })
      return true
    })    
  }

  // 获取本机号码备选列表，初始化本机号码
  const handleGetOutCallNumbers=async()=>{
    if(!phone.outCallRandom){
      const res=await getOutCallNumbers()
      handleRes(res,()=>{
        const {data=[]}=res;
        setOutCallNumbers(data);
        let selectedOutCallNumber='';
        if(data.length===1){
          selectedOutCallNumber=data[0]
        } else if(data.length>1){
          selectedOutCallNumber = getStorage('outCallNumber');
          if(!data.includes(selectedOutCallNumber)){
            selectedOutCallNumber=data[0]
          }
        }
        handleSetOutCallNumber(selectedOutCallNumber)
        return true
      },()=>true)
    }
  }

  // TODO 处理内部通话
  const handleIntercom=()=>{

  }

  // TODO 处理 status 切换
  const handleSetStatus=async(value:Array<number>|number,autoSwitch:boolean=false)=>{
    const [currentStatus,currentRestStatus]=Array.isArray(value)?value:[value,defaultRestStatus];
    
    // 检查被踢
    if(kickedOut) {
      const {originStatus} = phone;
      if((currentStatus || originStatus)) {
        dispatch({
          type: 'PHONE_SET',
          payload: {
            status: 0
          }
        })
      }
      debug(`[sendStatus] ${seatStatusMap[originStatus].kickedText || '账号被踢'}`);
    }

    // debug('[changeStatus]  status:%s mode:%d', this.getStatusText(status, statusExt), mode);
    dispatch({
      type: 'PHONE_SET',
      payload: {
        status: currentStatus
      }
    })
  }

  useEffect(() => {
    handleGetOutCallNumbers()
  }, [phone.outCallRandom]);

  
  return (
    <div className="call-header">
      <div className="line">
        <p className="line-mode-text">电话服务</p>
        <i className="iconfont icon-phonex line-mode" style={{color:phone.mode!==PhoneMode.phone?'#888':'inherit'}}  title={phone.mode!==PhoneMode.phone?'点击切换为手机在线':'点击切换为软电话'} onClick={handleToggleMode}></i>
        {/* TODO 网络延迟 */}
        {jitterBuffer>0?<i title="当前通话网络延迟:{jitterBuffer}ms" className={`u-icon-wifi line-network_${getNetworkLevel(jitterBuffer)}`}></i>:null}
        <i className="line-indicator" style={{backgroundColor:seatStatusMap[phone.status].color}}></i>
        <Select className="line-statuses" defaultValue={phone.status} onChange={handleSetStatus}>
          {softSelectOptions.map(option=>{
            const currentStatus=seatStatusMap[option];
            const subOptions=currentStatus.value===2?mapObject(restStatusMap,(currentRestStatus)=>(
              <SelectOption key={currentRestStatus.value} value={[currentStatus.value,currentRestStatus.value]} label={`${currentStatus.text}-${currentRestStatus.text}`} width={98} className="line-statuses-item">
                <i className={`iconfont icon-${currentRestStatus.icon}`} style={{color:currentStatus.color}}></i>
                <p>{currentRestStatus.text}</p>
              </SelectOption>
            )):[];
            return (
            <SelectOption key={currentStatus.value} value={currentStatus.value} label={currentStatus.text} subOptions={subOptions} width={98}  className="line-statuses-item">
              <i className={`iconfont icon-${currentStatus.icon}`} style={{color:currentStatus.color}}></i>
              <p>{currentStatus.text}</p>
              {
                currentStatus.value===2?<i className="iconfont icon-arrowright"></i>:null
              }
            </SelectOption>
          )
          })}
        </Select>
      </div>
      <div className="line">
        <p>本机号码：</p>
        {callNumber}
        {
          isIntercomAllowed?<i className="iconfont icon-callout" onClick={handleIntercom}></i>:null
        }
      </div>
    </div>
  );
};

export default CallHeader;