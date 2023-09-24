"use client";

import { useAccount, useEnsName } from "wagmi";

export function Account() {
  const { address } = useAccount();

  return (
    <div>
      {/* {ensName ?? address}
      {ensName ? ` (${address})` : null} */}
    </div>
  );
}
