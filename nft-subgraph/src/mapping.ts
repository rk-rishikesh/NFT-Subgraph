import { BigInt } from "@graphprotocol/graph-ts"
import {
  NFT,
  NFTRegistered,
  Transfer,
  Approval,
  ApprovalForAll
} from "../generated/NFT/NFT"
import { NFTData } from "../generated/schema"
import { createAccount } from './wallet'
import {
  isMint,
  getNFTId,
  cancelActiveOrder,
  clearNFTOrderProperties
} from './nft'

export function handleNFTRegistered(event: NFTRegistered): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type

  let entity = NFTData.load(event.address.toHexString() + '-' + event.params._tokenId.toString())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new NFTData(event.address.toHexString() + '-' + event.params._tokenId.toString())
  }

  // Entity fields can be set based on event parameters
  entity._by = event.params._by.toHex()
  entity._tokenId = event.params._tokenId
  entity.nftAddress = event.address.toHexString()
  let contract = NFT.bind(event.address)
  entity.tokenURI = contract.tokenURI(entity._tokenId)
  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.addNFTMetadata(...)
  // - contract.balanceOf(...)
  // - contract.exists(...)
  // - contract.getApproved(...)
  // - contract.isApprovedForAll(...)
  // - contract.name(...)
  // - contract.ownerOf(...)
  // - contract.symbol(...)
  // - contract.tokenByIndex(...)
  // - contract.tokenCounter(...)
  // - contract.tokenOfOwnerByIndex(...)
  // - contract.tokenURI(...)
  // - contract.totalSupply(...)
}

export function handleTransfer(event: Transfer): void {
  if (event.params._tokenId.toString() == '') {
    return
  }
  
  let entity = NFTData.load(event.address.toHexString() + '-' + event.params._tokenId.toString())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new NFTData(event.address.toHexString() + '-' + event.params._tokenId.toString())
  }

  entity._by = event.params._to.toHex()
  entity._tokenId = event.params._tokenId
  entity.nftAddress = event.address.toHexString()
  let contract = NFT.bind(event.address)
  entity.tokenURI = contract.tokenURI(entity._tokenId)
  entity.updatedAt = event.block.timestamp

  if (isMint(event)) {
    entity.createdAt = event.block.timestamp

    entity.searchText = ''

    // let metric = buildCountFromNFT(nft)
    // metric.save()
  } else {
    let oldNFT = NFTData.load(event.transaction.from.toHex())
    if (cancelActiveOrder(oldNFT!, event.block.timestamp)) {
      entity = clearNFTOrderProperties(entity!)
    }
  }

  createAccount(event.params._to)

  entity.save()
  
}

export function handleApproval(event: Approval): void {}

export function handleApprovalForAll(event: ApprovalForAll): void {}
