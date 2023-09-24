"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { BaseError } from "viem";
import {
  Address,
  useAccount,
  useNetwork,
  useWaitForTransaction,
  useContractRead,
  usePrepareContractWrite,
  useContractWrite,
} from "wagmi";

import { ApolloProvider } from "react-apollo";
import {
  useErc20Allowance,
  useErc20Approve,
  useErc20BalanceOf,
  useErc20Name,
  useErc20Symbol,
  useErc20TotalSupply,
  useErc20Transfer,
  usePrepareErc20Approve,
  usePrepareErc20Transfer,
} from "../generated";
import { airdropAbi } from "./abi";
import ApolloClient, { InMemoryCache, gql } from "apollo-boost";
import { atom, useAtom, useAtomValue } from "jotai";
// import { ApolloClient, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  uri: "https://squid.subsquid.io/test-sqd-airdrop/v/v1/graphql",
  cache: new InMemoryCache(),
});

const GET_USER_QUERY = gql`
  query getUsers {
    addresses(where: { value_gte: "10000000000000000000" }) {
      id
      value
    }
  }
`;

const defaultTokenAddress = "0x13A291900C5D27ba266e92389dC022025165D76B";
const defaultAirdropAddress = "0x65Ec0d18bCe9408786fCA6e1aD1821CE8704E09B";

const addressAmountAtom = atom<number>(0);
const tokenPerAccountAtom = atom<number>(1);
interface recipientProp {
  recipient: string;
  amount: bigint;
}
const recipientsAtom = atom<recipientProp[]>([{ recipient: "", amount: 0n }]);

export function ERC20() {
  const { address } = useAccount();
  const [tokenAddress, setTokenAddress] =
    useState<Address>(defaultTokenAddress);
  const [airdropAddress, setAirdropAddress] = useState<Address>(
    defaultAirdropAddress
  );
  const [perAmount, setPerAmount] = useState<number>(1);

  return (
    <ApolloProvider client={client}>
      <div className="block items-center pt-2">
        <div>
          <label className="text-[#0A2540]">Airdrop Address: </label>
          <input
            className="ml-[30px] appearance-none mx-5 w-120 bg-white text-gray-700  py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white rounded-full"
            style={{ width: 400 }}
            value={airdropAddress}
            onChange={(e) => setAirdropAddress(e.target.value as Address)}
          />
        </div>
        <div>
          <label className="text-[#0A2540]">Token Address: </label>
          <input
            className="ml-[30px] appearance-none mx-5 w-120 bg-white text-gray-700  py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white rounded-full"
            style={{ width: 400 }}
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value as Address)}
          />
        </div>
        <>
          <h3></h3>
          <div className="stats my-5 bg-[#635AFF]">
            <div className="stat place-items-center">
              <div className="stat-title text-gray-200">Name</div>
              <Name tokenAddress={tokenAddress} />
              <div className="stat-desc"></div>
            </div>

            <div className="stat place-items-center">
              <div className="stat-title text-gray-200">Balance</div>
              <BalanceOf address={address} tokenAddress={tokenAddress} />
              <div className="stat-desc text-secondary">BalanceOf</div>
            </div>

            <div className="stat place-items-center">
              <div className="stat-title text-gray-200">Total Supply</div>
              <TotalSupply tokenAddress={tokenAddress} />
              <div className="stat-desc">TotalSupply</div>
            </div>
          </div>

          <h3></h3>
          <TokenPerAccount />
          <Allowance
            address={address}
            contractAddress={airdropAddress}
            tokenAddress={tokenAddress}
          />
          <Airdrop
            contractAddress={airdropAddress}
            tokenAddress={tokenAddress} // token address
            profileAddress={address} // token owner
          />
        </>
      </div>
    </ApolloProvider>
  );
}

function Name({ tokenAddress }: { tokenAddress: Address }) {
  const { data: name } = useErc20Name({ address: tokenAddress });
  const { data: symbol } = useErc20Symbol({ address: tokenAddress });
  return (
    <div className="text-white">
      {name} ({symbol})
    </div>
  );
}
function TotalSupply({ tokenAddress }: { tokenAddress: Address }) {
  const { data: totalSupply } = useErc20TotalSupply({ address: tokenAddress });
  const totalSupplyDecimal = totalSupply ? Number(totalSupply) / 10 ** 18 : 0;

  return <div className="text-white">{totalSupplyDecimal}</div>;
}

function BalanceOf({
  address,
  tokenAddress,
}: {
  address?: Address;
  tokenAddress: Address;
}) {
  const { data: balance } = useErc20BalanceOf({
    address: tokenAddress,
    args: address ? [address] : undefined,
    watch: true,
  });
  let balanceDecimal = balance ? Number(balance) / 10 ** 18 : 0;

  return <div className="text-white">{balanceDecimal}</div>;
}

function Airdrop({
  contractAddress, //airdrop
  tokenAddress, //token address
  profileAddress,
}: {
  contractAddress?: Address;
  tokenAddress: Address;
  profileAddress?: Address;
}) {
  const [recipients, setRrecipients] = useAtom(recipientsAtom);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressAmount, setAddressAmount] = useAtom(addressAmountAtom);
  const TokenPerAccount = useAtomValue(tokenPerAccountAtom);

  async function getUsers() {
    try {
      const { data } = await client.query({
        query: GET_USER_QUERY,
      });

      const users = data.addresses;
      setAddresses(users);
      setAddressAmount(users.length);
      console.log(users.slice(0, 10));
      let recipientsList = [];
      for (let i = 0; i < users.length; i++) {
        recipientsList.push({
          recipient: users[i].id as string,
          amount: BigInt(TokenPerAccount),
        });
      }

      setRrecipients(recipientsList);
    } catch (error) {}
  }

  const { write } = useContractWrite({
    address: contractAddress,
    abi: airdropAbi,
    functionName: "airdropERC20",
    args: [tokenAddress, profileAddress, recipients],
  });

  return (
    <div className="flex items-center">
      <button
        className="btn rounded-full bg-[#635AFF] border-[#635AFF] text-white mr-2 my-2 btn-xs sm:btn-sm md:btn-md lg:btn-md"
        onClick={() => getUsers()}
      >
        Get Addresses
      </button>

      <button
        onClick={() => {
          write?.();
        }}
        disabled={addresses.length === 0}
        className="btn rounded-full mr-2 border-[#635AFF] bg-[#635AFF] text-white  my-2 btn-xs sm:btn-sm md:btn-md lg:btn-md"
      >
        Airdrop
      </button>
      <p>To: {addressAmount} accounts</p>
    </div>
  );
}

const TokenPerAccount = () => {
  const [tokenPerAccount, setTokenPerAccount] = useAtom(tokenPerAccountAtom);
  return (
    <div>
      <div className="text-[#0A2540]">
        Amount Per Address:{" "}
        <input
          type="number"
          onChange={(e) => setTokenPerAccount(Number(e.target.value))}
          placeholder="amount (units)"
          value={tokenPerAccount}
          className="appearance-none mx-5 w-60 bg-white text-gray-700  py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white rounded-full"
        />
      </div>
    </div>
  );
};

function Allowance({
  address,
  contractAddress,
  tokenAddress,
}: {
  address?: Address;
  contractAddress: Address;
  tokenAddress: Address;
}) {
  const [spender, setSpender] = useState(contractAddress);
  const tokenPerAccount = useAtomValue(tokenPerAccountAtom);
  const addressAmount = useAtomValue(addressAmountAtom);

  const { config, error, isError } = usePrepareErc20Approve({
    address: tokenAddress,
    args:
      spender && addressAmount
        ? [spender, BigInt(addressAmount * tokenPerAccount * 1e18)]
        : undefined,
    enabled: Boolean(spender && addressAmount),
  });

  const { data, write } = useErc20Approve(config);

  const { isLoading, isSuccess } = useWaitForTransaction({ hash: data?.hash });

  const { data: balance } = useErc20Allowance({
    address: tokenAddress,
    args: spender && address ? [address, contractAddress] : undefined,
    watch: true,
  });

  const allowance = balance ? Number(balance) / 1e18 : 0;

  return (
    <div>
      <div className="text-[#0A2540]">
        Airdrop Allowance:{" "}
        <input
          disabled={isLoading}
          placeholder="amount (units)"
          value={tokenPerAccount * addressAmount}
          className="appearance-none mx-5 w-60 bg-white text-gray-700  py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white rounded-full"
        />
        <button
          disabled={isLoading && !write}
          className="btn text-white rounded-full bg-[#635AFF] border-[#635AFF] mr-2 my-2 btn-xs sm:btn-sm md:btn-md lg:btn-md"
          onClick={() => write?.()}
        >
          set
        </button>
        {isLoading && <ProcessingMessage hash={data?.hash} />}
        {isSuccess && <div>Success!</div>}
        {isError && <div>Error: {(error as BaseError)?.shortMessage}</div>}
      </div>
      <div className="text-[#0A2540]">Allowance: {allowance}</div>
    </div>
  );
}

function ProcessingMessage({ hash }: { hash?: `0x${string}` }) {
  const { chain } = useNetwork();
  const etherscan = chain?.blockExplorers?.etherscan;
  return (
    <span>
      Processing transaction...{" "}
      {etherscan && (
        <a href={`${etherscan.url}/tx/${hash}`}>{etherscan.name}</a>
      )}
    </span>
  );
}
