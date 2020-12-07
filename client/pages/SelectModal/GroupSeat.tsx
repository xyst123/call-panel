import React, { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle } from 'react';
// @ts-ignore
import { Select } from 'ppfish';
import { ISeat, IGroup } from '@/constant/phone';
import { getSeats, } from '@/service/phone';
import Board from '@/pages/SelectModal/Board';
import useGlobal from '@/hooks/global';
import { handleRes, get } from '@/utils';

const { Option: SelectOption } = Select;
const allGroupsText = '所有客服组';

const Group: React.FC<any> = ({ seat, childRef, onSelect }: {
  seat: ISeat
  childRef: React.RefObject<any>
  onSelect: Function
}) => {
  const [seats, setSeats] = useState<ISeat[]>([]);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [groupId, setGroupId] = useState(0);
  const [groupName, setGroupName] = useState('');
  const { global } = useGlobal();
  const actionText = get(global, 'selectModalConfig.extData.action', '');

  const handleSetSeats = async (id: number = groupId) => {
    setLoading(true);
    const res = await getSeats(id);
    setLoading(false);

    handleRes(res, (data: {
      kefu: ISeat[],
      group: IGroup[]
    }) => {
      if (id === 0) {
        setGroups(data.group)
      }
      setGroupId(id);
      setSeats(data.kefu);
    }, () => { })
  }

  const reset = () => {
  }

  useImperativeHandle(childRef, () => ({
    reset,
    reload: handleSetSeats
  }));

  useEffect(() => {
    const group = groups.filter(group => group.id === groupId)[0];
    setGroupName(group ? group.name : allGroupsText)
  }, [groups, groupId])

  useEffect(() => {
    handleSetSeats()
  }, [])

  return <>
    <Select
      style={{ width: '100%' }}
      size="large"
      value={groupName}
      placeholder="请选择客服组"
      showSingleClear
      showSearch
      filterOption={(input: string, option: any) => option.props.children.toString().toLowerCase().indexOf(input.toLowerCase()) >= 0}
      onChange={(groupId: string) => {
        handleSetSeats(Number(groupId))
      }} >
      {groups.map(group => <SelectOption key={group.id}>{group.name}</SelectOption>)}
    </Select>
    <Board type='seat' selected={seat} list={seats} loading={loading} emptyText={groupName ? `未找到与${groupName}相关的可${actionText}客服组` : `没有可${actionText}的客服组`} onSelect={onSelect} />
  </>
}

export default Group