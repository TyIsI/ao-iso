import * as React from 'react'
import { observer } from 'mobx-react'
import { withUseStore } from './store'
import api from '../client/api'
import { HudStyle } from './cardHud'

interface ValueProps {
  taskId: string
  hudStyle: HudStyle
}

interface State {
  editing: boolean
  text: string
}

export const defaultState: State = {
  editing: false,
  text: ''
}

@observer
class AoValue extends React.PureComponent<ValueProps, State> {
  constructor(props) {
    super(props)
    this.state = defaultState
    this.startEditing = this.startEditing.bind(this)
    this.stopEditing = this.stopEditing.bind(this)
    this.saveValue = this.saveValue.bind(this)
    this.onChange = this.onChange.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)
  }

  componentDidMount() {
    this.props.aoStore.registerCloseable(this.stopEditing)
  }

  componentWillUnmount() {
    this.props.aoStore.unregisterCloseable(this.stopEditing)
  }

  startEditing(event) {
    event.stopPropagation()

    const card = this.props.aoStore.hashMap.get(this.props.taskId)
    if (!card) return null

    if (card.completeValue) {
      this.setState({
        text: card.completeValue.toString()
      })
    }
    this.setState({ editing: true })
  }

  stopEditing() {
    this.setState({ editing: false })
  }

  saveValue(event) {
    event.stopPropagation()

    const taskId = this.props.taskId
    const card = this.props.aoStore.hashMap.get(taskId)
    if (!card) return null

    let newValue: number =
      this.state.text.length > 0 ? parseInt(this.state.text, 10) : 0
    if (newValue === card.completeValue) {
      this.setState({ editing: false })
      return
    }
    if (newValue !== NaN) {
      api.valueCard(taskId, newValue)
      this.setState({ editing: false })
    }
  }

  onKeyDown(event) {
    if (event.key === 'Enter') {
      this.saveValue(event)
    } else if (event.key === 'Escape') {
      this.setState({ editing: false, text: '' })
    }
  }

  onChange(event) {
    this.setState({ text: event.target.value })
  }

  render() {
    const card = this.props.aoStore.hashMap.get(this.props.taskId)
    if (!card) return null

    if (this.state.editing) {
      return (
        <div className="value">
          <input
            type="text"
            onChange={this.onChange}
            onKeyDown={this.onKeyDown}
            value={this.state.text}
            size={1}
            autoFocus
          />
          <button type="button" onClick={this.saveValue}>
            Set Value
          </button>
        </div>
      )
    }
    switch (this.props.hudStyle) {
      case 'full before':
        if (card.completeValue) {
          return (
            <div onClick={this.startEditing} className={'value full action'}>
              {card.completeValue + ' points'}
            </div>
          )
        }
        return null
      case 'mini before':
        if (card.completeValue) {
          return (
            <span className={'value mini'}>{card.completeValue + 'p'}</span>
          )
        }
        return null
      case 'menu':
        return (
          <div className={'value menu'}>
            <div onClick={this.startEditing} className={'action'}>
              {card.completeValue
                ? 'worth ' + card.completeValue + ' points if checked'
                : 'set checkmark value'}
            </div>
          </div>
        )
      case 'face before':
      case 'collapsed':
      default:
        if (card.completeValue > 0) {
          return (
            <div className={'value summary ' + this.props.hudStyle}>
              {card.completeValue + 'p'}
            </div>
          )
        }
        return null
    }
  }
}
export default withUseStore(AoValue)
