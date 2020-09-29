import React from 'react'
import { observer } from 'mobx-react'
import { withUseStore} from './store'
import api from '../client/api'

interface GridResizerProps {
  taskId: string
}

@observer
class AoGridResizer extends React.PureComponent<
  GridResizerProps
> {
  constructor(props) {
    super(props)
    this.increaseRows = this.increaseRows.bind(this)
    this.decreaseRows = this.decreaseRows.bind(this)
    this.increaseColumns = this.increaseColumns.bind(this)
    this.decreaseColumns = this.decreaseColumns.bind(this)
  }

  increaseRows() {
    const card = this.props.aoStore.hashMap.get(this.props.taskId)
    api.resizeGrid(this.props.taskId, card.grid.height + 1, card.grid.width)
  }

  decreaseRows() {
    const card = this.props.aoStore.hashMap.get(this.props.taskId)
    api.resizeGrid(this.props.taskId, card.grid.height - 1, card.grid.width)
  }

  increaseColumns() {
    const card = this.props.aoStore.hashMap.get(this.props.taskId)
    api.resizeGrid(this.props.taskId, card.grid.height, card.grid.width + 1)
  }

  decreaseColumns() {
    const card = this.props.aoStore.hashMap.get(this.props.taskId)
    api.resizeGrid(this.props.taskId, card.grid.height, card.grid.width - 1)
  }

  render() {
    const card = this.props.aoStore.hashMap.get(this.props.taskId)

    if (!card.grid) {
      return null
    }

    return (
      <div className={'resizer'}>
        <div className={'columns'}>
          <button
            type="button"
            onClick={this.decreaseColumns}
            disabled={card.grid.width <= 1}
            className={'action minus'}>
            -
          </button>
          <button
            type="button"
            onClick={this.increaseColumns}
            disabled={card.grid.width >= 100}
            className={'action plus'}>
            +
          </button>
        </div>
        <div className={'rows'}>
          <button
            type="button"
            onClick={this.decreaseRows}
            disabled={card.grid.height <= 1}
            className={'action minus'}>
            -
          </button>
          <button
            type="button"
            onClick={this.increaseRows}
            disabled={card.grid.height >= 100}
            className={'action plus'}>
            +
          </button>
        </div>
      </div>
    )
  }
}

export default withUseStore(AoGridResizer)
