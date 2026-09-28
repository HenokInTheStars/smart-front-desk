'use client';

import React from 'react';
import styled, { keyframes } from 'styled-components';

interface AnimatedCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = ({ checked, onChange, className }) => {
  return (
    <StyledWrapper className={className}>
      <label className="container">
        <input 
          type="checkbox" 
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="checkmark" />
      </label>
    </StyledWrapper>
  );
}

const wipeDown = keyframes`
  0% { transform: translateY(0); }
  100% { transform: translateY(40px); }
`;

const wipeUp = keyframes`
  0% { transform: translateY(40px); }
  100% { transform: translateY(0px); }
`;

const StyledWrapper = styled.div`
  /* Hide the default checkbox */
  .container input {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }

  .container {
    display: block;
    position: relative;
    cursor: pointer;
    font-size: 16px; /* Adjusted slightly down from 20px to fit better inline */
    user-select: none;
    border: 2px solid #beddd0;
    border-radius: 8px;
    overflow: hidden;
    line-height: 1;
    width: 1.3em;
    height: 1.3em;
  }

  /* Create a custom checkbox */
  .checkmark {
    position: absolute;
    top: 0;
    left: 0;
    height: 1.3em;
    width: 1.3em;
    background-color: #2dc38c;
    border-bottom: 1.5px solid #2dc38c; /* Bottom stroke */
    box-shadow: 0 0 1px #cef1e4, inset 0 -2.5px 3px #62eab8,
      inset 0 3px 3px rgba(0, 0, 0, 0.34); /* Inner shadow */
    border-radius: 6px;
    transition: transform 0.3s ease-in-out; /* Transition for smooth animation */
  }

  /* When the checkbox is checked, modify the checkmark appearance */
  .container input:checked ~ .checkmark {
    transform: translateY(0px);
    animation: ${wipeUp} 0.4s ease-in-out forwards; /* Bring it up to show */
  }

  /* When the checkbox is not checked, modify the checkmark appearance */
  .container input:not(:checked) ~ .checkmark {
    transform: translateY(40px);
    animation: ${wipeDown} 0.4s ease-in-out forwards; /* Move it down to hide */
  }

  /* Create the checkmark/indicator */
  .checkmark:after {
    content: "";
    position: absolute;
    display: none;
  }

  /* Show the checkmark when checked */
  .container input:checked ~ .checkmark:after {
    display: block;
  }

  /* Style the checkmark/indicator */
  .container .checkmark:before {
    content: "";
    position: absolute;
    left: 7px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    box-shadow: 0 4px 2px rgba(0, 0, 0, 0.34); /* Icon drop shadow */
  }
`;

export default AnimatedCheckbox;
