import React, { useState, useEffect, useCallback, useRef } from 'react';
import { iterateMatchDOM } from '@/utils';
import '@/style/Select.less';

export const SelectOption: React.FC<{
  children: any[],
  value: any,
  label: string,
  width?: number,
  onOptionClick?: Function,
  className?: string,
  subOptions?: any[],
  [key: string]: any;
}> = ({ value, label, width = 'auto', onOptionClick = Function.prototype, children, className, subOptions = [], ...props }) => {
  return (
    <li className={`select-option ${className}`} style={{ width: `${width}px` }} {...props} onClick={() => {
      if (!subOptions.length) {
        onOptionClick({
          value,
          label
        })
      }
    }}>
      {children}
      {
        subOptions.length ? (<ul className="select-option-list" style={{ left: Number.isNaN(width) ? 'auto' : `${width}px` }}>
          {subOptions.map((subOption: any) => {
            const { value: subOptionValue, label: subOptionLabel } = subOption.props;
            return React.cloneElement(subOption, {
              onOptionClick() {
                onOptionClick({
                  value: subOptionValue,
                  label: subOptionLabel
                })
              }
            })
          })}
        </ul>) : null
      }
    </li>
  );
};

export const Select: React.FC<{
  children: any[],
  defaultValue?: any,
  disabled?: boolean,
  overflowY?: 'visible' | 'scroll',
  onChange?: Function,
  className?: string,
  [key: string]: any;
}> = ({ defaultValue, disabled = false, overflowY = 'scroll', onChange = Function.prototype, children, className, ...props }) => {
  const [valueLabel, setValueLabel] = useState<Common.IValueLabel>({
    value: null, label: ''
  });
  const [showOptions, setShowOptions] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const handleHideOptions = useRef((event: Event) => {
    const match = iterateMatchDOM(event.target as HTMLElement, selectRef.current as HTMLDivElement);
    if (!match) {
      setShowOptions(false)
    }
  })

  useEffect(() => {
    const [defaultChild] = children.filter((child: any) => child.props.value === defaultValue);
    if (defaultChild) {
      const { value, label } = defaultChild.props;
      setValueLabel({
        value, label
      })
    }
  }, [defaultValue]);

  useEffect(() => {
    window.addEventListener('click', handleHideOptions.current)
    return () => {
      window.removeEventListener('click', handleHideOptions.current)
    }
  }, []);

  return (
    <div className={`select ${className}`} ref={selectRef} {...props}>
      <div className={`select-display ${disabled ? 'select-display_disabled' : ''}`} onClick={() => {
        if (disabled) {
          setShowOptions(false);
          return
        };
        setShowOptions(!showOptions)
      }}>
        <p>{valueLabel.label}</p>
        <i className="iconfont icon-triangle-down"></i>
      </div>
      <ul className={`select-options select-options_${showOptions ? 'show' : 'hide'}`} style={{ overflowY, maxHeight: overflowY === 'scroll' ? '300px' : 'auto' }}>
        {children.map((child: any) => {
          return React.cloneElement(child, {
            onOptionClick(result: Common.IValueLabel) {
              if (result.value !== valueLabel.value) {
                setValueLabel(result);
                onChange(result.value)
              }
              setShowOptions(false)
            }
          })
        })}
      </ul>
    </div >
  );
};