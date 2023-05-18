import React from 'react';

interface ButtonProps {
  /**
   * Button styling variant
   */
  variant?: 'Primary' | 'Secondary' | 'Mini';
  /**
   * How large should the button be?
   */
  size?: 'xs' | 'sm';
  fullWidth?: boolean;
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
  fullWidth=false,
  ...props
}: ButtonProps) => {
  const secondaryClasses = `whitespace-nowrap rounded text-${size} border border-gray-200 px-1.5 py-1  text-black dark:border-gray-700 dark:text-white`;
  const primaryClasses = `whitespace-nowrap rounded text-${size} border border-gray-900 bg-gray-800 px-3 py-1 text-white dark:border-gray-200 dark:bg-gray-300 dark:text-black`;
  const miniClasses = `whitespace-nowrap rounded text-${size} px-1.5 py-1  text-black dark:border-gray-700 dark:text-white absolute inset-y-0 right-0 focus:outline-none`;
  const hoverClasses = `cursor-pointer hover:border-black hover:shadow dark:hover:border-white`;
  const setVariant = function () {
    let classFactory=[];
    switch(variant) {
      case "Primary":  
        classFactory.push(primaryClasses)
        break
      case "Secondary":  
        classFactory.push(secondaryClasses)
        break
      case "Mini": 
        classFactory.push(miniClasses)
        break
    }
    if(!disabled) {
      classFactory.push(hoverClasses)
    }
    if(fullWidth) {
      classFactory.push(' w-full')
    }
    return classFactory.join('')
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
