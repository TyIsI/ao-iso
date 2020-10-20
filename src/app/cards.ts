import api from '../client/api'
import { createAoStore, pubState } from '../app/store'

export type CardZone =
	| 'card'
	| 'priorities'
	| 'grid'
	| 'subTasks'
	| 'completed'
	| 'context'
	| 'discard'
	| 'panel'

export interface Coords {
	x?: number
	y: number
}

export interface CardLocation {
	taskId: string
	inId: string
	zone: CardZone
	coords: Coords
}

export interface CardPlay {
	from: CardLocation
	to: CardLocation
}

export function prioritizeCard(move: CardPlay) {
	const aoStore = createAoStore(
		__CLIENT__
			? window.PRELOADED_STATE
			: { session: null, token: null, user: null, loggedIn: false, ...pubState }
	)
	if (!move.from.taskId) {
		return
	}
	const nameFrom = aoStore.hashMap.get(move.from.taskId).name

	switch (move.from.zone) {
		case 'card':
			// maybe this doesn't make sense, it's supposed to be for the whole card
			break
		case 'priorities':
			if (move.from.inId === move.to.inId) {
				api.prioritizeCard(move.from.taskId, move.from.inId)
			} else {
				api.findOrCreateCardInCard(nameFrom, move.to.inId, true)
			}
			break
		case 'grid':
			api
				.unpinCardFromGrid(
					move.from.coords.x,
					move.from.coords.y,
					move.from.inId
				)
				.then(() => api.prioritizeCard(move.from.taskId, move.to.inId))
			break
		case 'completed':
		case 'completed':
			api.prioritizeCard(move.from.taskId, move.to.inId)
			break
		case 'discard':
			aoStore.popDiscardHistory()
		case 'subTasks':
		case 'context':
		case 'panel':
			api.findOrCreateCardInCard(nameFrom, move.to.inId, true)
			break
		default:
			break
	}
}

export function subTaskCard(move: CardPlay) {
	const aoStore = createAoStore(
		__CLIENT__
			? window.PRELOADED_STATE
			: { session: null, token: null, user: null, loggedIn: false, ...pubState }
	)
	if (!move.from.taskId) {
		return
	}
	const nameFrom = aoStore.hashMap.get(move.from.taskId).name

	switch (move.from.zone) {
		case 'card':
			// maybe this doesn't make sense, it's supposed to be for the whole card
			break
		case 'priorities':
			if (move.from.inId) {
				api
					.refocusCard(move.from.taskId, move.from.inId)
					.then(() => api.findOrCreateCardInCard(nameFrom, move.to.inId))
			} else {
				api.findOrCreateCardInCard(nameFrom, move.to.inId)
			}
			break
		case 'grid':
			api.unpinCardFromGrid(
				move.from.coords.x,
				move.from.coords.y,
				move.from.inId
			)
			break
		case 'discard':
			aoStore.popDiscardHistory()
		case 'completed':
		case 'subTasks':
		case 'context':
		case 'panel':
			api.findOrCreateCardInCard(nameFrom, move.to.inId)
			break
		default:
			break
	}
}

// this is actually about members, not cards, but not gonna split the file yet
export function isSenpai(memberId: string) {
	const aoStore = createAoStore(
		__CLIENT__
			? window.PRELOADED_STATE
			: { session: null, token: null, user: null, loggedIn: false, ...pubState }
	)
	const theirCard = aoStore.hashMap.get(memberId)
	if (!theirCard) {
		console.log('invalid member detected')
		return 0
	}
	const theirVouches = theirCard.deck
		.map(mId => aoStore.hashMap.get(mId))
		.filter(memberCard => memberCard !== undefined).length

	const myVouches = aoStore.memberCard.deck
		.map(mId => aoStore.hashMap.get(mId))
		.filter(memberCard => memberCard !== undefined).length

	let theirRank = aoStore.state.members.findIndex(m => m.memberId === memberId)
	let myRank = aoStore.state.members.findIndex(
		m => m.memberId === aoStore.member.memberId
	)
	if (theirRank < myRank && theirVouches > myVouches) {
		return 1
	} else if (myRank < theirRank && myVouches > theirVouches) {
		return -1
	}
	return 0
}

export function countCurrentSignatures(signed: Signature[]) {
	let mostRecentSignaturesOnly = signed.filter((signature, index) => {
		let lastIndex
		for (let i = signed.length - 1; i >= 0; i--) {
			if (signed[i].memberId === signature.memberId) {
				lastIndex = i
				break
			}
		}
		return lastIndex === index
	})
	return mostRecentSignaturesOnly.filter(signature => signature.opinion >= 1)
		.length
}
