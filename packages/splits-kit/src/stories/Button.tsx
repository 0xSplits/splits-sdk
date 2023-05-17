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
  onClick?: any;
  /**
   * Optional disabled
   */
  disabled?: boolean;
}

/**
 * Primary UI component for user interaction
 */
export const Button = ({
  variant,
  size = 'sm',
  disabled,
  children,
  ...props
}: ButtonProps) => {
  const secondaryClasses = `whitespace-nowrap rounded text-${size} border border-gray-200 px-1.5 py-1  text-black dark:border-gray-700 dark:text-white`;
  const primaryClasses = `whitespace-nowrap rounded text-${size} border border-gray-900 bg-gray-800 px-3 py-1 text-white dark:border-gray-200 dark:bg-gray-300 dark:text-black`;
  const miniClasses = `whitespace-nowrap rounded text-${size} px-1.5 py-1  text-black dark:border-gray-700 dark:text-white`;
  const setVariant = function () {
    switch(variant) {
      case "Primary": return primaryClasses
      case "Secondary": return secondaryClasses
      case "Mini": return miniClasses
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={setVariant()}
      {...props}
    >
      {children}
    </button>
  );
};
