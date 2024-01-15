import Blockies from 'react-blockies'
import { getAddress } from 'viem'

export default function Identicon({
  address,
  size = 18,
  className,
}: {
  address: string
  size?: number
  className?: string
}) {
  return (
    <Blockies
      seed={getAddress(address)}
      size={size / 4}
      className={`rounded-full ${className}`}
    />
  )
}
