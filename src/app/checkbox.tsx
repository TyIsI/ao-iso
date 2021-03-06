import React from 'react'
import { observable, computed } from 'mobx'
import { observer } from 'mobx-react'
import { withUseStore } from './store'
import api from '../client/api'
import { HudStyle } from './card-hud'
import Completed from '../assets/images/completed.svg'
import Uncompleted from '../assets/images/uncompleted.svg'

interface CheckboxProps {
  taskId: string
  hudStyle: HudStyle
}

@observer
class AoCheckbox extends React.PureComponent<CheckboxProps> {
  @computed get isCompleted() {
    const card = this.props.aoStore.hashMap.get(this.props.taskId)
    if (!card) return undefined
    return card.claimed.indexOf(this.props.aoStore.member.memberId) >= 0
  }

  @computed get isGrabbed() {
    const card = this.props.aoStore.hashMap.get(this.props.taskId)
    if (!card) return undefined
    return card.deck.indexOf(this.props.aoStore.member.memberId) >= 0
  }

  render() {
    const taskId = this.props.taskId
    const card = this.props.aoStore.hashMap.get(taskId)
    if (!card) return null

    const onClick = event => {
      event.stopPropagation()
      event.nativeEvent.stopImmediatePropagation()

      if (this.isCompleted) {
        api.uncheckCard(taskId)
      } else {
        api.completeCard(taskId)
      }
    }
    switch (this.props.hudStyle) {
      case 'full before':
      case 'face before':
      case 'collapsed':
        if (this.isCompleted || this.isGrabbed) {
          return (
            <img
              className="checkbox"
              src={this.isCompleted ? Completed : Uncompleted}
              onClick={onClick}
              onDoubleClick={event => {
                event.stopPropagation()
                event.nativeEvent.stopImmediatePropagation()
              }}
            />
          )
        }
        return null
      case 'mini before':
        if (this.isCompleted) {
          return <img src={Completed} className={'checkbox mini'} />
        }
        return null
      default:
        return null
    }
  }
}

export default withUseStore(AoCheckbox)
