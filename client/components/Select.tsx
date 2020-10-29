import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getType,iterateMatchDOM } from '@/utils';
import '@/style/Select.less';

export const Select: React.FC<any> = ({defaultValue,onChange=Function.prototype, children,className }) => {
  const [valueLabel, setValueLabel] =useState<Common.IValueLabel>({
    value:null,label:''
  });
  const [showOptions, setShowOptions] =useState(false);
  const selectRef=useRef<HTMLDivElement>(null);
  const handleHideOptions=useRef((event:Event)=>{
    const match = iterateMatchDOM(event.target as HTMLElement,selectRef.current as HTMLDivElement);
    if(!match){
      setShowOptions(false)
    }
  })

  useEffect(() =>{
    const [defaultChild]=children.filter((child:any)=>child.props.value===defaultValue);
    if(defaultChild){
      const {value,label}=defaultChild.props;
      setValueLabel({
        value,label
      })
    }
  }, [defaultValue]);

  useEffect(() =>{
    window.addEventListener('click',handleHideOptions.current)
    return ()=>{
      window.removeEventListener('click',handleHideOptions.current)
    }
  }, []);

  return (
    <div className={`select ${className}`} ref={selectRef}>
      <div className="select-display" onClick={setShowOptions.bind(null,!showOptions)}>
        <p>{valueLabel.label}</p>
        <i className="iconfont icon-triangle-down"></i>
      </div>
      <ul className={`select-options select-options_${showOptions?'show':'hide'}`}>
        {children.map((child:any)=>{
          return React.cloneElement(child,{
            onOptionClick(result:Common.IValueLabel){
              if(result.value!==valueLabel.value){
                setValueLabel(result);
                onChange(result.value)
              }
              setShowOptions(false)
            }
          })
        })}
      </ul>
    </div>
  );
};

export const SelectOption:React.FC<any> = ({value,label,width='auto',onOptionClick , children, className, subOptions=[] }) => {
  return (
    <li className={`select-option ${className}`} style={{width:`${width}px`}} onClick={()=>{
      if(!subOptions.length){
        onOptionClick({
          value,
          label
        })
      }
    }}>
      {children}
      {
        subOptions.length?(<ul className="select-option-list" style={{left:`${width}px`}}>
        {subOptions.map((subOption:any)=>{
          const {value:subOptionValue,label:subOptionLabel}=subOption.props;
          return React.cloneElement(subOption,{
            onOptionClick(){
              onOptionClick({
                value:subOptionValue,
                label:subOptionLabel
              })
            }
          })
        })}
      </ul>):null
      }
    </li>
  );
};
