import LightbidAbi from '../abi/Lightbid.json';
import TestERC20Abi from '../abi/TestERC20.json';
import TestERC721Abi from '../abi/TestERC721.json';
import ILightbidAbi from '../abi/ILightbid.json';
import { APP_CONFIG } from './appConfig';

export const CONTRACT_ADDRESSES = APP_CONFIG.contracts;

export const CONTRACT_ABIS = {
  Lightbid: LightbidAbi,
  TestERC20: TestERC20Abi,
  TestERC721: TestERC721Abi,
  ILightbid: ILightbidAbi,
} as const;

export enum AssetType {
  ERC721 = 0,
  ERC1155 = 1,
  ERC20 = 2,
}

export enum AuctionStatus {
  Active = 0,
  Settled = 1,
  Cancelled = 2,
}

export interface Auction {
  id: bigint;
  seller: `0x${string}`;
  assetType: AssetType;
  token: `0x${string}`;
  tokenId: bigint;
  amount: bigint;
  paymentToken: `0x${string}`;
  reservePrice: bigint;
  minIncrementBps: bigint;
  highestBid: bigint;
  highestBidder: `0x${string}`;
  startTime: bigint;
  endTime: bigint;
  status: AuctionStatus;
}
