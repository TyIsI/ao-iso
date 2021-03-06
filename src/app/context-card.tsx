import * as React from 'react'
import { computed } from 'mobx'
import { observer } from 'mobx-react'
import { AOStore, Task, withUseStore } from './store'
import { Redirect } from 'react-router-dom'
import api from '../client/api'
import { delay, cancelablePromise } from './utils'
import Markdown from 'markdown-to-jsx'
import AoPaper from './paper'
import AoGrid from './grid'
import AoStack from './stack'
import AoCompleted from './completed'
import AoCardHud from './card-hud'
import AoMission from './mission'
import AoAttachment from './attachment'
import AoCoin from './coin'
import AoPreview from './preview'
import AoCheckmark from './checkmark'
import AoMemberIcon from './member-icon'
import BlankBadge from '../assets/images/badge_blank.svg'
import { prioritizeCard, subTaskCard, CardZone } from './cards'
import { hideAll as hideAllTippys } from 'tippy.js'

export type CardStyle =
	| 'priority'
	| 'face'
	| 'full'
	| 'compact'
	| 'mini'
	| 'checkmark'
	| 'context'
	| 'mission'
	| 'member'

export interface DragContext {
	zone: CardZone
	inId?: string
	x?: number
	y: number
}

interface CardProps {
	task: Task
	cardStyle?: CardStyle
	inlineStyle?: React.CSSProperties
	noContextOnFull?: boolean
	noPopups?: boolean
	noFindOnPage?: boolean
	aoStore: AOStore
}

interface State {
	showPriorities?: boolean
	showProjects?: boolean
	redirect?: string
}

@observer
class AoContextCard extends React.PureComponent<CardProps, State> {
	constructor(props) {
		super(props)
		this.state = {}
		this.togglePriorities = this.togglePriorities.bind(this)
		this.toggleProjects = this.toggleProjects.bind(this)
		this.newPriority = this.newPriority.bind(this)
		this.newSubTask = this.newSubTask.bind(this)
		this.goInCard = this.goInCard.bind(this)
		this.onHover = this.onHover.bind(this)
		this.renderCardContent = this.renderCardContent.bind(this)
		this.clearPendingPromise = this.clearPendingPromise.bind(this)
	}

	componentDidUpdate(prevProps, prevState) {
		console.log('componentDidUpdate redirect is ', this.state.redirect)
		if (this.state.redirect !== undefined) {
			this.setState({ redirect: undefined })
		}
	}

	componentWillUnmount() {
		this.clearPendingPromise()
	}

	pendingPromise = undefined

	clearPendingPromise() {
		if (this.pendingPromise) {
			this.pendingPromise.cancel()
		}
		this.pendingPromise = undefined
	}

	togglePriorities(event) {
		event.stopPropagation()
		event.nativeEvent.stopImmediatePropagation()
		if (!this.state.showPriorities) {
			this.setState({ showPriorities: true, showProjects: false })
		} else {
			this.setState({ showPriorities: false })
		}
	}

	toggleProjects(event) {
		event.stopPropagation()
		event.nativeEvent.stopImmediatePropagation()
		if (!this.state.showProjects) {
			this.setState({ showProjects: true, showPriorities: false })
		} else {
			this.setState({ showProjects: false })
		}
	}

	newPriority(name: string) {
		const card = this.props.task
		if (!card) {
			console.log('missing card')
		}
		api.findOrCreateCardInCard(name, card.taskId, true)
	}

	newSubTask(name: string) {
		const card = this.props.task
		if (!card) {
			console.log('missing card')
		}
		api.findOrCreateCardInCard(name, card.taskId)
	}

	goInCard(event) {
		event.stopPropagation()
		hideAllTippys()
		this.props.aoStore.closeAllCloseables()

		const card = this.props.task
		if (!card) {
			console.log('missing card')
			return
		}
		const taskId = card.taskId
		console.log('goInCard taskId is ', taskId)
		if (this.props.cardStyle === 'context') {
			this.props.aoStore.clearContextTo(taskId)
		} else {
			this.props.aoStore.addToContext([this.props.aoStore.currentCard])
		}
		this.props.aoStore.setCurrentCard(taskId)
		this.setState({ redirect: taskId }, () => {
			this.props.aoStore.removeFromContext(taskId)
		})
	}

	async onHover(event) {
		event.preventDefault()
		event.stopPropagation()
		const card = this.props.task
		if (
			card.seen &&
			card.seen.some(s => s.memberId === this.props.aoStore.member.memberId)
		) {
			return
		}

		if (this.pendingPromise !== undefined) {
			return
		}

		this.pendingPromise = cancelablePromise(delay(2000))
		return this.pendingPromise.promise
			.then(() => {
				if (
					!card.seen ||
					(card.seen &&
						!card.seen.some(
							s => s.memberId === this.props.aoStore.member.memberId
						))
				) {
					api.markSeen(this.props.task.taskId)
				}
				this.clearPendingPromise()
			})
			.catch(errorInfo => {
				// rethrow the error if the promise wasn't
				// rejected because of a cancelation
				this.clearPendingPromise()
				if (!errorInfo.isCanceled) {
					throw errorInfo.error
				}
			})
	}

	@computed get applyClassIfCurrentSearchResult() {
		if (this.props.noFindOnPage) {
			return ''
		}
		if (
			this.props.aoStore.searchResults &&
			this.props.aoStore.searchResults.hasOwnProperty('all') &&
			this.props.aoStore.searchResults.all.some(task => {
				return task.taskId === this.props.task.taskId
			})
		) {
			return ' searchedOnPage'
		}
		return ''
	}

	renderCardContent(content: string, hideIframes = false) {
		// hideIframes doesn't  work. it's supposed to hide YouTube embeds in the mini card.

		return (
			<Markdown
				options={{
					forceBlock: false,
					overrides: {
						a: {
							props: {
								target: '_blank',
							},
						},
						iframe: {
							props: {
								display: hideIframes ? 'inherit' : 'none',
							},
						},
					},
				}}>
				{content}
			</Markdown>
		)
	}

	projectCards() {
		if (this.props.cardStyle !== 'mission') {
			return undefined
		}
		const card = this.props.task

		let projectCards: Task[] = []
		let allSubCards = card.priorities.concat(card.subTasks, card.completed)

		allSubCards.forEach(tId => {
			let subCard = this.props.aoStore.hashMap.get(tId)
			if (subCard) {
				if (subCard.guild && subCard.guild.length >= 1) {
					projectCards.push(subCard)
				}
			}
		})

		if (card.grid && card.grid.rows) {
			Object.entries(card.grid.rows).forEach(([y, row]) => {
				Object.entries(row).forEach(([x, cell]) => {
					let gridCard = this.props.aoStore.hashMap.get(cell)
					if (gridCard && gridCard.guild && gridCard.guild.length >= 1) {
						projectCards.push(gridCard)
					}
				})
			})
		}

		return projectCards
	}

	render() {
		if (this.state.redirect) {
			console.log('redirecting')
			return <Redirect to={this.state.redirect} />
		}

		const card = this.props.task
		if (!card) {
			console.log('missing card')
			return (
				<div className={'card ' + this.props.cardStyle}>
					<div className={'content'}>missing card</div>
				</div>
			)
		}

		const taskId = card.taskId

		const subTaskCardCallback = subTaskCard(this.props.aoStore)
		const prioritizeCardCallback = prioritizeCard(this.props.aoStore)

		let member
		let content = card.name
		if (taskId === content) {
			member = this.props.aoStore.memberById.get(taskId)
			if (member) {
				content = member.name
			}
		}

		let priorityCards: Task[]
		if (card.priorities && card.priorities.length >= 1) {
			priorityCards = card.priorities.map(tId =>
				this.props.aoStore.hashMap.get(tId)
			)
		}

		let subTaskCards: Task[]
		if (card.subTasks && card.subTasks.length >= 1) {
			subTaskCards = card.subTasks.map(tId =>
				this.props.aoStore.hashMap.get(tId)
			)
		}

		let cardStyle = this.props.cardStyle ? this.props.cardStyle : 'face'
		switch (cardStyle) {
			case 'context':
				return (
					<div
						className={'card context' + this.applyClassIfCurrentSearchResult}
						id={'card-' + taskId}
						onDoubleClick={this.goInCard}
						onMouseEnter={this.onHover}
						onMouseOver={this.onHover}
						onMouseOut={this.clearPendingPromise}
						style={this.props.inlineStyle ? this.props.inlineStyle : null}>
						<AoPaper taskId={taskId} />
						<AoCardHud taskId={taskId} hudStyle={'context'} />
						<div className={'content'}>
							{member && <AoMemberIcon memberId={taskId} />}
							{this.renderCardContent(content)}
						</div>
					</div>
				)
			case 'member':
			case 'priority':
				return (
					<div
						id={'card-' + taskId}
						className={
							'card priority' +
							this.applyClassIfCurrentSearchResult +
							(this.state.showPriorities ? ' padbottom' : '')
						}
						onDoubleClick={this.goInCard}
						onMouseEnter={this.onHover}
						onMouseOver={this.onHover}
						onMouseOut={this.clearPendingPromise}>
						<AoPaper taskId={taskId} />
						<AoCardHud
							taskId={taskId}
							hudStyle={'collapsed'}
							prioritiesShown={this.state.showPriorities}
							onTogglePriorities={this.togglePriorities}
						/>
						<div className={'content'}>
							<AoCoin taskId={taskId} noPopups={this.props.noPopups} />
							{member && <AoMemberIcon memberId={taskId} />}
							{this.renderCardContent(content)}
							<AoAttachment taskId={taskId} hudStyle={'collapsed'} />
						</div>
						{this.state.showPriorities ? (
							<AoStack
								inId={taskId}
								cards={priorityCards}
								cardStyle={'priority'}
								zone={'priorities'}
							/>
						) : null}
					</div>
				)
			case 'face':
			case 'compact':
				return (
					<div
						id={'card-' + taskId}
						className={
							'card ' +
							this.props.cardStyle +
							this.applyClassIfCurrentSearchResult
						}
						onDoubleClick={this.goInCard}
						onMouseEnter={this.onHover}
						onMouseOver={this.onHover}
						onMouseOut={this.clearPendingPromise}>
						<AoPaper taskId={taskId} />
						<AoCardHud taskId={taskId} hudStyle={'face before'} />
						<div className={'content'}>
							<AoMission taskId={taskId} hudStyle={'face before'} />
							{member && <AoMemberIcon memberId={taskId} />}
							{this.renderCardContent(content)}
							<AoAttachment taskId={taskId} hudStyle={'face before'} />
							{card.priorities && card.priorities.length >= 1 ? (
								<>
									<div className="action" onClick={this.togglePriorities}>
										{card.priorities.length}{' '}
										{card.priorities.length > 1 ? 'priorities' : 'priority'}{' '}
										{this.state.showPriorities ? (
											<React.Fragment>&#8963;</React.Fragment>
										) : (
											<React.Fragment>&#8964;</React.Fragment>
										)}
									</div>
									{this.state.showPriorities ? (
										<AoStack
											inId={taskId}
											cards={priorityCards}
											showAdd={true}
											hideAddWhenCards={true}
											addButtonText={'+priority'}
											cardStyle={'priority'}
											onNewCard={this.newPriority}
											onDrop={prioritizeCardCallback}
											zone={'priorities'}
										/>
									) : null}
								</>
							) : null}
						</div>
						<AoCardHud
							taskId={taskId}
							hudStyle={'face after'}
							noPopups={this.props.noPopups}
						/>
					</div>
				)
			case 'full':
				return (
					<React.Fragment>
						{this.props.noContextOnFull ? (
							''
						) : (
							<div id={'context'}>
								<AoStack
									cards={this.props.aoStore.contextCards}
									cardStyle={'context'}
									alwaysShowAll={true}
									zone={'context'}
								/>
							</div>
						)}
						<div
							id={'card-' + taskId}
							className={'card full' + this.applyClassIfCurrentSearchResult}
							onDrop={e => {
								e.preventDefault()
								e.stopPropagation()
							}}
							onMouseEnter={this.onHover}
							onMouseOver={this.onHover}
							onMouseOut={this.clearPendingPromise}>
							<AoPaper taskId={taskId} />
							<AoCardHud taskId={taskId} hudStyle={'full before'} />
							<div className="content">
								<AoMission taskId={taskId} hudStyle={'full before'} />
								{member && <AoMemberIcon memberId={taskId} />}
								{this.renderCardContent(content)}
								<AoAttachment taskId={taskId} hudStyle={'full before'} />
							</div>
							<AoStack
								inId={taskId}
								cards={priorityCards}
								showAdd={true}
								hideAddWhenCards={true}
								addButtonText={'+priority'}
								cardStyle={'priority'}
								onNewCard={this.newPriority}
								onDrop={prioritizeCardCallback}
								zone={'priorities'}
							/>
							<AoGrid taskId={taskId} />
							<AoStack
								inId={taskId}
								cards={subTaskCards}
								showAdd={true}
								onNewCard={this.newSubTask}
								onDrop={subTaskCardCallback}
								zone={'subTasks'}
							/>
							<AoCompleted taskId={taskId} />
							<AoCardHud taskId={taskId} hudStyle={'full after'} />
						</div>
					</React.Fragment>
				)
			case 'checkmark':
				return (
					<div
						id={'card-' + taskId}
						className={'card checkmark' + this.applyClassIfCurrentSearchResult}
						onMouseEnter={this.onHover}
						onMouseOver={this.onHover}
						onMouseOut={this.clearPendingPromise}>
						<AoCheckmark taskId={taskId} onGoIn={this.goInCard} />
					</div>
				)
			case 'mission':
				// A format that emphasizes the mission and projects (sub-missions), for the Missions Index
				const projectCards = this.projectCards()
				return (
					<div
						className={
							'card mission' +
							(this.state.showPriorities ? ' padbottom' : '') +
							this.applyClassIfCurrentSearchResult
						}
						id={'card-' + taskId}
						onDoubleClick={this.goInCard}
						onMouseEnter={this.onHover}
						onMouseOver={this.onHover}
						onMouseOut={this.clearPendingPromise}>
						<AoPaper taskId={taskId} />
						<AoCardHud taskId={taskId} hudStyle={'collapsed-mission'} />
						<div className={'content'}>
							<AoCoin taskId={taskId} />
							<AoMission taskId={taskId} hudStyle={'collapsed'} />
							<AoPreview
								taskId={taskId}
								hudStyle={'collapsed'}
								prioritiesShown={this.state.showPriorities}
								onTogglePriorities={this.togglePriorities}
								projectsShown={this.state.showProjects}
								onToggleProjects={this.toggleProjects}
								hideSubcardCountOnCollapsed={true}
							/>
						</div>
						{this.state.showProjects ? (
							<AoStack
								inId={taskId}
								cards={projectCards}
								cardStyle={'mission'}
								zone={'panel'}
							/>
						) : null}
						{this.state.showPriorities ? (
							<AoStack
								inId={taskId}
								cards={priorityCards}
								cardStyle={'priority'}
								zone={'panel'}
							/>
						) : null}
						<div style={{ clear: 'both', height: '1px' }} />
					</div>
				)
			case 'badge':
				return (
					<div
						id={'card-' + taskId}
						className={'card badge' + this.applyClassIfCurrentSearchResult}
						onClick={this.goInCard}
						onMouseEnter={this.onHover}
						onMouseOver={this.onHover}
						onMouseOut={this.clearPendingPromise}>
						<AoPaper taskId={taskId} />
						<img className="background" src={BlankBadge} />
						<AoMission taskId={taskId} hudStyle={'badge'} />
						<AoCardHud taskId={taskId} hudStyle={'badge'} />
					</div>
				)
				break
			case 'mini':
			default:
				let shortened = content
				if (shortened.length > 32) {
					shortened = shortened.substr(0, shortened.lastIndexOf(' ', 32))
				}

				return (
					<div
						id={'card-' + taskId}
						className={'card mini' + this.applyClassIfCurrentSearchResult}
						onDoubleClick={this.goInCard}
						onMouseEnter={this.onHover}
						onMouseOver={this.onHover}
						onMouseOut={this.clearPendingPromise}>
						<AoPaper taskId={taskId} />
						<AoCardHud taskId={taskId} hudStyle={'mini before'} />
						<div className={'content'}>
							{member && <AoMemberIcon memberId={taskId} />}
							{this.renderCardContent(content, true)}
							<AoAttachment taskId={taskId} hudStyle={'mini before'} />
						</div>
						<AoCardHud taskId={taskId} hudStyle={'mini after'} />
					</div>
				)
		}
	}
}

export default withUseStore(AoContextCard)
