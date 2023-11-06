import { Menu } from '@headlessui/react'

interface MenuItem {
  title: string
  icon?: JSX.Element
  onClick: () => void
}

const DropdownMenu = ({
  buttonBody,
  menuTitle,
  menuItems,
  menuPosition,
}: {
  buttonBody: JSX.Element
  menuTitle?: string
  menuItems: MenuItem[]
  menuPosition?: 'top' | 'right' | 'bottom' | 'left' | 'bottomRight'
}): JSX.Element => {
  const positionMap = {
    top: 'bottom-full mb-0.5',
    right: 'top-full mt-0.5 left-0',
    bottom: 'top-full mt-0.5',
    left: 'top-full mt-0.5 right-0',
    bottomRight: 'top-full mt-0.5 right-0',
  }
  return (
    <Menu as={'div'}>
      <div className={'relative'}>
        <Menu.Button className={`flex w-full`}>{buttonBody}</Menu.Button>
        <Menu.Items
          className={`absolute z-40 ${
            positionMap[menuPosition ?? 'bottom']
          } w-40 overflow-hidden rounded bg-black py-1 text-xs focus:outline-none dark:bg-[#000] md:shadow-lg`}
        >
          {menuTitle && (
            <div className={'px-3 py-1.5 opacity-50'}>{menuTitle}</div>
          )}
          {menuItems.map((item, idx) => (
            <Menu.Item key={idx}>
              {({ active }) => (
                <button
                  onClick={() => {
                    item.onClick()
                  }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-white focus:outline-none ${
                    active && `bg-blue-500`
                  }`}
                >
                  <div className={'flex-grow'}>{item.title}</div>
                  {item.icon && <div>{item.icon}</div>}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </div>
    </Menu>
  )
}

export default DropdownMenu
