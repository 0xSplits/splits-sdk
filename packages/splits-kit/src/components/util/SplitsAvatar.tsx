import Blockies from 'react-blockies'
import { getAddress } from 'viem'
import { normalize } from 'viem/ens'
import { useEnsAvatar, useEnsName } from 'wagmi'

export default function SplitsAvatar({
  address,
  size = 18,
  className,
}: {
  address: string
  size?: number
  className?: string
}) {
  const ensName = useEnsName({
    address: getAddress(address),
  })
  const ensAvatar = useEnsAvatar({
    name: ensName.data ? normalize(ensName.data) : undefined,
  })

  if (ensAvatar.data) {
    return (
      <img
        src={ensAvatar.data}
        alt={ensName.data || address}
        width={size}
        height={size}
        className={`rounded-full ${className}`}
      />
    )
  }

  return (
    <Blockies
      seed={getAddress(address)}
      size={size / 4}
      className={`rounded-full ${className}`}
    />
  )
}
