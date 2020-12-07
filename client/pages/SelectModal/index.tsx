import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
// @ts-ignore
import { Modal, Tabs } from 'ppfish';
import Seat from '@/pages/SelectModal/Seat';
import Group from '@/pages/SelectModal/Group';
import GroupSeat from '@/pages/SelectModal/GroupSeat';
import IVR from '@/pages/SelectModal/IVR';
import Other from '@/pages/SelectModal/Other';
import { get } from '@/utils';
import { TabKey, ISeat, IGroup, IIVR } from '@/constant/phone';
import useGlobal from '@/hooks/global';
import '@/style/Select-Modal.less';

const { TabPane } = Tabs;

const IntercomModal: React.FC<any> = () => {
  const { global } = useGlobal();
  const [tabKey, setTabKey] = useState(TabKey.seat);
  const [seat, setSeat] = useState<ISeat | null>(null);
  const [group, setGroup] = useState<IGroup | null>(null);
  const [ivr, setIVR] = useState<IIVR | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const SeatRef = useRef<RefObject<any>>(null);
  const GroupRef = useRef<RefObject<any>>(null);
  const GroupSeatRef = useRef<RefObject<any>>(null);
  const IVRRef = useRef<RefObject<any>>(null);

  const { visible, text, tabs, handler } = global.selectModalConfig;

  const dispatch = useDispatch();

  const selectSeat = (seat: ISeat) => {
    if (seat._disabled) return;
    setSeat(seat)
  }

  const selectGroup = (group: IGroup) => {
    if (group._disabled) return;
    setGroup(group)
  }

  const selectIVR = (ivr: IIVR) => {
    setIVR(ivr)
  }

  const close = () => {
    dispatch({
      type: 'GLOBAL_RESET',
      payload: {
        selectModalConfig: true
      }
    })
  }

  const tabMap = ({
    [TabKey.seat]: {
      key: String(TabKey.seat),
      onReload() {
        // @ts-ignore
        SeatRef.current?.reload();
      },
      onCurrent() {
        // @ts-ignore
        GroupRef.current?.reset();
        // @ts-ignore
        GroupSeatRef.current?.reset();
      },
      okButtonDisabled: !seat,
      content: <Seat seat={seat} childRef={SeatRef} onSelect={selectSeat} />
    },
    [TabKey.group]: {
      key: String(TabKey.group),
      onReload() {
        // @ts-ignore
        GroupRef.current?.reload();
      },
      onCurrent() {
        // @ts-ignore
        SeatRef.current?.reset();
      },
      okButtonDisabled: !group,
      content: <Group group={group} childRef={GroupRef} onSelect={selectGroup} />
    },
    [TabKey.groupSeat]: {
      key: String(TabKey.groupSeat),
      onReload() {
        // @ts-ignore
        GroupSeatRef.current?.reload();
      },
      onCurrent() {
        // @ts-ignore
        SeatRef.current?.reset();
      },
      okButtonDisabled: !seat,
      content: <GroupSeat seat={seat} childRef={GroupSeatRef} onSelect={selectSeat} />
    },
    [TabKey.ivr]: {
      key: String(TabKey.ivr),
      onReload() {
        // @ts-ignore
        IVRRef.current?.reload();
      },
      onCurrent() { },
      okButtonDisabled: !ivr,
      content: <IVR childRef={IVRRef} onSelect={selectIVR} />
    },
    [TabKey.other]: {
      key: String(TabKey.other),
      onReload() { },
      onCurrent() { },
      okButtonDisabled: !phoneNumber,
      content: <Other phoneNumber={phoneNumber} onInput={setPhoneNumber} />
    }
  })

  const handleChangeTabKey = (key: string) => {
    const realKey = Number(key) as TabKey;
    tabMap[realKey].onCurrent();
    setSeat(null);
    setGroup(null);
    setPhoneNumber('');
    setTabKey(realKey);
  }

  const title = <div className="select-title">
    <h3>{text}</h3>
    <div onClick={() => {
      tabMap[tabKey].onReload()
    }}>
      <i className="iconfont icon-refresh"></i>
      <p>刷新</p>
    </div>
  </div>

  useEffect(() => {
    setTabKey(get(tabs[0], 'id', TabKey.seat))
  }, [tabs])

  return (
    <Modal
      visible={visible}
      title={title}
      okButtonDisabled={get(tabMap[tabKey], 'okButtonDisabled', false)}
      onCancel={close}
      onOk={() => {
        const data = {};
        switch (tabKey) {
          case TabKey.seat:
          case TabKey.groupSeat:
            Object.assign(data, {
              staffid: seat?.id,
              name: seat?.realname
            })
            break;
          case TabKey.group:
            Object.assign(data, {
              groupid: group?.id,
              name: group?.name
            })
            break;
          case TabKey.ivr:
            Object.assign(data, {
              ivrSettingId: ivr?.value,
              name: ivr?.label,
              ivrId: ivr?.ivrId,
            })
            break;
          case TabKey.other:
            Object.assign(data, {
              phone: phoneNumber,
              name: phoneNumber
            })
            break;
          default:
        }
        handler(data);
        close()
      }}
    >
      <Tabs activeKey={String(tabKey)} size="normal" onChange={handleChangeTabKey}>
        {
          tabs.map((tab: { id: TabKey, name: string }) => {
            const tabConfig = tabMap[tab.id];
            return <TabPane tab={tab.name} key={tabConfig.key}>
              <div className="select-content">
                {tabConfig.content}
              </div>
            </TabPane>
          })
        }
      </Tabs>
    </Modal >
  );
};

export default IntercomModal