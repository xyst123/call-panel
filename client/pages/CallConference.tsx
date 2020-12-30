import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { sipAdaptor } from '@/utils/sip';
import { audioHangupSound } from '@/constant/element';
import { IMember } from '@/constant/phone';
import usePhone, { phoneReset, handleConference } from '@/hooks/phone';
import useGlobal from '@/hooks/global';
import { sessionCheck, muteMember, deleteMember } from '@/service/phone';
import { get, handleRes, mapObject } from '@/utils';
import { useDispatch } from 'react-redux';
// @ts-ignore
import { Tooltip } from 'ppfish';
import '@/style/CallConference.less';

const waitingArray = [0, 1, 2];

const CallConference: React.FC<any> = () => {
  const { phone } = usePhone();
  const { global } = useGlobal();

  const dispatch = useDispatch();

  const handleBye = () => {
    window.debug('[colBye]');
    sipAdaptor.callSDK('bye');

    const isSessionSeat = phone.isBusy && phone.callStatus !== 'conference';
    const isConferenceChairman = phone.callStatus === 'conference';
    if (audioHangupSound && (isSessionSeat || isConferenceChairman)) {
      // @ts-ignore
      audioHangupSound.hangupFrom = 1;
    }
    if (phone.session.sessionId) {
      sessionCheck(phone.session.sessionId);
    }

    setTimeout(() => {
      // 解决因为外呼异常，无法挂机的问题
      // 1s后如果还是没能正常挂机，强制恢复状态
      if (phone.isBusy && phone.callStatus === 'callOut') {
        phoneReset(phone, dispatch)()
      }
    }, 1000);
  };

  // @ts-ignore
  const members: IMember[] = useMemo(() => mapObject(get(phone, 'conference.members', {}), (member) => member).sort((a, b) => a.time - b.time), [phone]);
  const { length: memberLength } = members;

  const handleAddMember = () => {
    dispatch({
      type: 'GLOBAL_SET_SELECT_MODAL',
      payload: { type: 'conference', handler: handleConference(phone, dispatch).bind(null, 'conference') }
    })
  }

  const handleMuteMember = async (member: IMember) => {
    const type = member.mute ? 'unmute' : 'mute'

    debug(`[${type}member] data:%O`, member);

    const res = await muteMember(type, {
      member: member.member,
      conferenceId: phone.conference.conferenceId
    });

    handleRes(res, () => {
      dispatch({
        type: 'PHONE_SET',
        payload: {
          conference: {
            members: {
              [member.member]: {
                mute: !member.mute
              }
            }
          }
        }
      })
    }, () => true)
  }

  const onCancel = () => {
    dispatch({ type: 'GLOBAL_RESET', payload: { modalConfig: true } })
  }

  const deleteMemberHandler = async (member: IMember) => {
    const res = await deleteMember({
      member: member.member,
      conferenceId: phone.conference.conferenceId
    });

    const newMembers = { ...phone.conference.members };
    delete newMembers[member.member]

    handleRes(res, () => {
      dispatch({
        type: 'PHONE_SET',
        payload: {
          conference: {
            members: newMembers
          }
        }
      })
    }, () => true)
  }

  const handleDeleteMember = (member: IMember) => {
    var self = this;
    if (global.isToolBar) {
      deleteMemberHandler(member);
    } else {
      dispatch({
        type: 'GLOBAL_SET',
        payload: {
          modalConfig: {
            visible: true,
            cancelButtonDisabled: true,
            children: '确定将该参会者踢出当前多人通话？',
            onOk() {
              onCancel();
              deleteMemberHandler(member);
            },
            onCancel
          }
        }
      })
    }
  }

  const getButtons = (member: IMember) => member.isChairman ? [{
    id: 'mute',
    text: `${member.mute ? '取消' : ''}静音`,
    className: `iconfont icon-shutup ${member.mute ? 'disabled' : ''}`,
    handler: handleMuteMember.bind(null, member)
  }] : [{
    id: 'shut-up',
    text: `${member.mute ? '取消' : ''}禁言`,
    className: `iconfont icon-shutup ${member.mute ? 'disabled' : ''}`,
    handler: handleMuteMember.bind(null, member)
  }, {
    id: 'delete',
    text: '踢出',
    className: `iconfont icon-member-out`,
    handler: handleDeleteMember.bind(null, member)
  }]

  useEffect(() => {

  }, [])

  return <div className="call-conference">
    <ul className="call-conference-board">
      {members.map((member, index) => {
        const buttons = getButtons(member);
        return <li className={`board-member ${memberLength > 3 && index < 3 ? 'board-member_small' : 'board-member_normal'}`}>
          <div className={`iconfont icon-member board-member-avatar ${member.state === 1 ? 'board-member-avatar_joined' : ''}`}></div>
          <Tooltip title={member.memberName}>
            <p className="board-member-name">{member.memberName}</p>
          </Tooltip>
          {
            member.state === 1 ? <ul className="board-member-buttons">
              {
                buttons.map(button => <Tooltip key={button.id} title={button.text}>
                  <li className={button.className} onClick={button.handler}></li>
                </Tooltip>)
              }
            </ul> : <ul className="board-member-waiting">
                {
                  waitingArray.map((item) => (<li key={item}></li>))
                }
              </ul>
          }
        </li>
      })}
      {memberLength < 5 ? <li className="board-member board-member_normal board-member_add" onClick={handleAddMember}>
        <i className="iconfont icon-add board-member-add"></i>
      </li> : null}
    </ul>
    <div className="call-conference-operate">
      <p>通话中</p>
      <button className="iconfont icon-hangup" onClick={handleBye}></button>
    </div>
  </div>
};

export default CallConference;