import * as React from 'react'
import { observer } from 'mobx-react'
import { withUseStore, Task, AoStore } from './store'
import api from '../client/api'
import AoPaper from './paper'

interface PaletteProps {
  taskId: string,
  aoStore: AoStore
}

interface State {
  color: string
}

export const defaultState: State = {
  color: undefined
}

@observer
class AoPalette extends React.PureComponent<
  PaletteProps,
  State
> {
  constructor(props) {
    super(props)
    this.state = defaultState
    this.onClick = this.onClick.bind(this)
  }

  onClick(event) {
    const { card, setRedirect } = this.context
    console.log('event.target is ', event.currentTarget)
    console.log(
      'getAttribute is ',
      event.currentTarget.getAttribute('data-color')
    )
    api.colorCard(
      this.props.taskId,
      event.currentTarget.getAttribute('data-color')
    )
    this.setState({ color: event.target.getAttribute('data-color') })
  }

  render() {
    const taskId = this.props.taskId
    const card = this.props.aoStore.hashMap.get(taskId)

    const list = ['red', 'yellow', 'green', 'blue', 'purple'].map(
      (colorName, i) => (
        <div
          onClick={this.onClick}
          data-color={colorName}
          className={'swatch'}
          key={i}>
          <div
            className={card.color === colorName ? 'border selected' : 'border'}>
            <AoPaper taskId={taskId} color={colorName} />
          </div>
          <div className={'label'}>{colorName}</div>
        </div>
      )
    )
    return <div className="palette">{list}</div>
  }
}

export default withUseStore(AoPalette)
