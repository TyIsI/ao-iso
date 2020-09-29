import React from 'react'
import { computed } from 'mobx'
import { observer } from 'mobx-react'
import { withUseStore } from './store'
import Paper1 from '../assets/images/paper_1.svg'
import Paper2 from '../assets/images/paper_2.svg'
import Paper3 from '../assets/images/paper_3.svg'
import Paper4 from '../assets/images/paper_4.svg'

interface PaperProps {
  taskId: string
  color?: string
}

@observer
class AoPaper extends React.PureComponent<PaperProps> {
  @computed
  get cardColor() {
    if (this.props && this.props.color) {
      return this.props.color
    }

    const card = this.props.aoStore.hashMap.get(this.props.taskId)

    if (!card) {
      return ''
    }

    const loadedColor = card.color

    switch (loadedColor) {
      case 'red':
      case 'yellow':
      case 'green':
      case 'blue':
      case 'purple':
      case 'black':
        return loadedColor
      default:
        return ''
    }
  }

  @computed get cardAge() {
    const taskId = this.props.taskId
    const card = this.props.aoStore.hashMap.get(taskId)

    if (!card) {
      return false
    }

    const now = Date.now()

    if (!card) {
      // console.log('Missing card in database. Clean up your database.')
      return false
    }

    let timestamp = Date.now()

    if (card.name === taskId) {
      let member = this.props.aoStore.memberById.get(taskId)
      if (!member) {
        return 366
      }
      if (!member.hasOwnProperty('timestamp')) {
        return false
      }
      timestamp = member.timestamp
    } else if (card.hasOwnProperty('created')) {
      // console.log(
      //   'Card without creation date found, please correct your database. Assuming card is old.'
      // )
      timestamp = card.created
    } else {
      return 366
    }

    const msSince = now - timestamp
    const days = msSince / (1000 * 60 * 60 * 24)
    return days
  }

  render() {
    const taskId = this.props.taskId
    const card = this.props.aoStore.hashMap.get(taskId)

    if (!card) {
      console.log('missing card on render paper')
    }

    let filename = Paper1
    if (this.cardAge >= 8) {
      filename = Paper2
    } else if (this.cardAge >= 30) {
      filename = Paper3
    } else if (this.cardAge >= 90) {
      filename = Paper4
    }
    return (
      <div className={'paper'}>
        <img src={filename} />
        <div className={'color ' + this.cardColor} />
      </div>
    )
  }
}

export default withUseStore(AoPaper)
