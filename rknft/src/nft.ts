import { log, BigInt } from '@graphprotocol/graph-ts'
import { Order, NFTData } from "../generated/schema"

import {
    NFT,
    Transfer
  } from "../generated/NFT/NFT"
import * as status from './status'
//import * as addresses from '../../data/addresses'

export function isMint(event: Transfer): boolean {
  return event.params._from.toHexString() == '0x0000000000000000000000000000000000000000'
}

export function getTokenURI(event: Transfer): string {
  let erc721 = NFT.bind(event.address)
  let tokenURICallResult = erc721.try_tokenURI(event.params._tokenId)

  let tokenURI = ''

  if (tokenURICallResult.reverted) {
    log.warning('tokenURI reverted for tokenID: {} contract: {}', [
      event.params._tokenId.toString(),
      event.address.toHexString()
    ])
  } else {
    tokenURI = tokenURICallResult.value
  }

  return tokenURI
}

export function updateNFTOrderProperties(nft: NFTData, order: Order): NFTData {
  if (order.status == status.OPEN) {
    return addNFTOrderProperties(nft, order)
  } else if (order.status == status.SOLD || order.status == status.CANCELLED) {
    return clearNFTOrderProperties(nft)
  } else {
    return nft
  }
}

export function addNFTOrderProperties(nft: NFTData, order: Order): NFTData {
  nft.activeOrder = order.id
  nft.searchOrderStatus = order.status
  nft.searchOrderPrice = order.price
  nft.searchOrderCreatedAt = order.createdAt
  nft.searchOrderExpiresAt = order.expiresAt
  return nft
}

export function clearNFTOrderProperties(nft: NFTData): NFTData {
  nft.activeOrder = ''
  nft.searchOrderStatus = null
  nft.searchOrderPrice = null
  nft.searchOrderCreatedAt = null
  nft.searchOrderExpiresAt = null
  return nft
}

export function cancelActiveOrder(nft: NFTData, now: BigInt): boolean {
  let oldOrder = Order.load(nft.activeOrder)
  if (oldOrder != null && oldOrder.status == status.OPEN) {
    // Here we are setting old orders as cancelled, because the smart contract allows new orders to be created
    // and they just overwrite them in place. But the subgraph stores all orders ever
    // you can also overwrite ones that are expired
    oldOrder.status = status.CANCELLED
    oldOrder.updatedAt = now
    oldOrder.save()

    return true
  }
  return false
}