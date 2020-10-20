import * as React from 'react'
import { computed } from 'mobx'
import { observer } from 'mobx-react'
import { AOStore, withUseStore, Task, emptySearchResults } from './store'
import InfiniteScroll from 'react-infinite-scroll-component'
import AoContextCard from './context-card'
import AoDragZone from './drag-zone'
import _ from 'lodash'

type SearchSort = 'alphabetical' | 'hodls' | 'oldest' | 'newest'

interface Props {
  aosTore: AOStore
}

interface State {
  query: string
  sort: SearchSort
  items?: number
  hasMore: boolean
  debounce?
}

export const defaultState: State = {
  query: '',
  sort: 'newest',
  items: undefined,
  hasMore: true
}

@observer
class AoSearch extends React.PureComponent<Props, State> {
  constructor(props) {
    super(props)
    this.state = defaultState
    this.componentDidMount = this.componentDidMount.bind(this)
    this.focus = this.focus.bind(this)
    this.onChange = this.onChange.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)
    this.onSearch = this.onSearch.bind(this)
    this.scrollMore = this.scrollMore.bind(this)
    this.sortBy = this.sortBy.bind(this)
    this.renderItems = this.renderItems.bind(this)
    this.renderSortButton = this.renderSortButton.bind(this)
  }

  private searchBox = React.createRef<HTMLInputElement>()

  componentDidMount() {
    this.searchBox.current.select()
    // ;(this.searchBox.current as any).onsearch = this.onSearch
    // ;(this.searchBox.current as any).incremental = true
  }

  focus() {
    this.searchBox.current.select()
  }

  onChange(event) {
    console.log('about to debounce')
    if (this.state.debounce) {
      clearTimeout(this.state.debounce)
    }

    this.setState({
      query: event.target.value,
      debounce: setTimeout(this.onSearch, 500)
    })
  }

  onKeyDown(event) {
    if (event.key === 'Escape') {
      // this should also close the entire search box tippy
      this.setState({ query: '' })
    }
  }

  onSearch() {
    const query = this.state.query
    console.log('search. query is ', query)
    if (query === undefined) {
      return
    }

    if (query === '') {
      this.setState({ query: undefined, items: undefined })
      return
    }

    if (query.length === 1) {
      // For snappier performance, you must type at least two characters to search
      return
    }

    this.props.aoStore.updateSearchResults(query)
    const minResults =
      this.props.aoStore.searchResults.length >= 1
        ? Math.min(this.props.aoStore.searchResults.length, 10)
        : 0
    let itemCount
    if (query.length >= 1 && minResults >= 1) {
      itemCount = Math.min(minResults)
    }
    this.setState({ query: query, items: itemCount })
  }

  @computed get sortedResults() {
    if (!this.props.aoStore.searchResults || this.props.aoStore.searchResults.length < 1) {
      return emptySearchResults
    }

    let sortedResults = emptySearchResults

    switch (this.state.sort) {
      case 'alphabetical':
        sortedResults.missions = this.props.aoStore.searchResults.missions
          .slice()
          .sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, {
              sensitivity: 'base'
            })
          })
        sortedResults.members = this.props.aoStore.searchResults.members
          .slice()
          .sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, {
              sensitivity: 'base'
            })
          })
        sortedResults.tasks = this.props.aoStore.searchResults.tasks
          .slice()
          .sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, {
              sensitivity: 'base'
            })
          })

        break
      case 'hodls':
        sortedResults.missions = this.props.aoStore.searchResults.missions
          .slice()
          .sort((a, b) => {
            return b.deck.length - a.deck.length
          })
        sortedResults.members = this.props.aoStore.searchResults.members
          .slice()
          .sort((a, b) => {
            return b.deck.length - a.deck.length
          })
        sortedResults.tasks = this.props.aoStore.searchResults.tasks
          .slice()
          .sort((a, b) => {
            return b.deck.length - a.deck.length
          })

        break
      case 'oldest':
        // Default sort is card creation order
        return this.props.aoStore.searchResults
      case 'newest':
        sortedResults.missions = this.props.aoStore.searchResults.missions
          .slice()
          .reverse()
        sortedResults.members = this.props.aoStore.searchResults.members.slice().reverse()
        sortedResults.tasks = this.props.aoStore.searchResults.tasks.slice().reverse()
        break
    }
    sortedResults.all = sortedResults.missions.concat(
      sortedResults.members,
      sortedResults.tasks
    )
    sortedResults.length = sortedResults.all.length

    return sortedResults
  }

  scrollMore() {
    const index = this.state.items
    const nextResults = this.sortedResults.all.slice(index, index + 5)
    let hasMore = true
    if (index + 5 > this.sortedResults.length) {
      hasMore = false
    }
    this.setState({
      items: index + 5,
      hasMore: hasMore
    })
  }

  sortBy(event) {
    const sort = event.currentTarget.getAttribute('data-sort')
    if (this.state.sort === sort) {
      return
    }
    this.setState({ sort: sort })
  }

  renderItems(items) {
    return items.map((task, i) => (
      <AoDragZone
        taskId={task.taskId}
        dragContext={{
          zone: 'panel',
          y: i
        }}
        key={task.taskId}>
        <AoContextCard task={task} cardStyle={'priority'} noFindOnPage={true} />
      </AoDragZone>
    ))
  }

  renderSearchResults() {
    if (this.state.items === undefined) {
      return ''
    }

    if (this.sortedResults.length === 0) {
      if (this.state.query && this.state.query.length >= 1) {
        return (
          <div id={'searchResults'} className={'results'}>
            0 results
          </div>
        )
      }
    }

    return (
      <React.Fragment>
        {this.sortedResults.length >= 2 ? (
          <div className={'toolbar'}>
            {this.renderSortButton('newest', 'Newest')}
            {this.renderSortButton('alphabetical', 'A-Z')}
            {this.renderSortButton('hodls', 'Hodls')}
            {this.renderSortButton('oldest', 'Order')}
          </div>
        ) : (
          ''
        )}
        <div id={'searchResults'} className={'results'}>
          <div>
            {this.sortedResults.length}{' '}
            {this.sortedResults.length === 1
              ? 'search result'
              : 'search results'}
          </div>
          <InfiniteScroll
            dataLength={this.state.items}
            next={this.scrollMore}
            scrollableTarget={'searchResults'}
            hasMore={this.state.hasMore}
            loader={<h4>Loading...</h4>}
            endMessage={
              <p style={{ textAlign: 'center' }}>
                End of {this.sortedResults.length}{' '}
                {this.sortedResults.length === 1 ? 'result' : 'results'}
              </p>
            }>
            {this.renderItems(
              this.sortedResults.all.slice(0, this.state.items)
            )}
          </InfiniteScroll>
        </div>
      </React.Fragment>
    )
  }

  renderSortButton(sort: SearchSort, label: string) {
    if (this.state.sort === sort) {
      return <p className={'action selected'}>{label}</p>
    } else {
      return (
        <p onClick={this.sortBy} data-sort={sort} className={'action'}>
          {label}
        </p>
      )
    }
  }

  render() {
    return (
      <React.Fragment>
        <input
          ref={this.searchBox}
          type="search"
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
          value={this.state.query}
          size={36}
          placeholder={'search for a card'}
          autoFocus
        />
        {this.renderSearchResults()}
      </React.Fragment>
    )
  }
}

export default withUseStore(AoSearch)