import * as React from 'react'
import { observer } from 'mobx-react'
import { AOStore, withUseStore } from './store'
import api from '../client/api'

interface Props {
  aoStore: AOStore
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
class AoServerName extends React.PureComponent<Props, State> {
  constructor(props) {
    super(props)
    this.state = defaultState
    this.startEditing = this.startEditing.bind(this)
    this.saveValue = this.saveValue.bind(this)
    this.onChange = this.onChange.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)
  }

  startEditing(event) {
    event.stopPropagation()
    if (this.props.aoStore.state.cash.alias) {
      this.setState({
        text: this.props.aoStore.state.cash.alias
      })
    }
    this.setState({ editing: true })
  }

  saveValue(event) {
    event.stopPropagation()
    if (
      this.state.text.length <= 0 ||
      this.state.text === this.props.aoStore.state.cash.alias
    ) {
      this.setState({ editing: false })
      return
    }
    api.nameAo(this.state.text)
    this.setState({ editing: false })
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
    if (this.state.editing) {
      return (
        <div className="serverName">
          <input
            type="text"
            onChange={this.onChange}
            onKeyDown={this.onKeyDown}
            value={this.state.text}
            size={18}
            autoFocus
          />
          <button type="button" onClick={this.saveValue}>
            Rename AO
          </button>
        </div>
      )
    }
    return (
      <div className={'serverName menu'}>
        <div onClick={this.startEditing} className={'action'}>
          {this.props.aoStore.state.cash.alias}
        </div>
      </div>
    )
  }
}

export default withUseStore(AoServerName)
