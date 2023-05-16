import React from 'react';
import './button.css';

interface ButtonProps {
  /**
   * Button styling variant
   */
  variant?: 'Primary' | 'Secondary' | 'Mini';
  /**
   * How large should the button be?
   */
  size?: 'xs' | 'sm';
  /**
   * Button contents
   */
  children: React.ReactNode
  /**
   * Optional click handler
   */
  onClick?: () => void;
}

/**
 * Primary UI component for user interaction
 */
export const Button = ({
  size = 'sm',
  children,
  ...props
}: ButtonProps) => {
  
  return (
    <button
      type="button"
      className={`whitespace-nowrap rounded text-${size} border border-gray-200 px-1.5 py-1  text-black dark:border-gray-700 dark:text-white`}
      {...props}
    >
      {children}
    </button>
  );
};
