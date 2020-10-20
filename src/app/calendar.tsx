import React from 'react'
import { observer } from 'mobx-react'
import { AOStore, withUseStore, Task } from './store'
import AoStack from './stack'
import AoPopupPanel from './popup-panel'
import Timecube from '../assets/images/timecube.svg'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  aoStore: AOStore
}

@observer
class AoCalendar extends React.PureComponent<Props> {
  render() {
    let events = this.props.aoStore.allEvents

    const todayMs = 64800000 // 18 hours
    const tomorrowMs = 172800000 // 48 hours
    const thisWeekMs = 604800000 // 1 week
    const nextWeekMs = thisWeekMs * 2 // 2 weeks
    const thisMonthMs = thisWeekMs * 4 // 4 weeks
    const nextMonthMs = thisMonthMs * 2 // 2 months
    const thisYearMs = 31536000000 // 365 days
    const pastBufferMs = 3600000 // assuming 1 hour event length by default

    let now: Task[] = [],
      today: Task[] = [],
      tomorrow: Task[] = [],
      thisWeek: Task[] = [],
      nextWeek: Task[] = [],
      thisMonth: Task[] = [],
      nextMonth: Task[] = [],
      thisYear: Task[] = [],
      eventually: Task[] = [],
      past: Task[] = [],
      overdue: Task[] = []

    events.forEach(task => {
      const timeToNow = task.book.startTs - Date.now()
      const isChecked = task.claimed.indexOf(this.props.aoStore.member.memberId) !== -1
      const isHodld = task.deck.indexOf(this.props.aoStore.member.memberId) !== -1

      if (timeToNow < -pastBufferMs && (!isHodld || isChecked)) {
        past.push(task)
      } else if (timeToNow < -pastBufferMs) {
        overdue.push(task)
      } else if (timeToNow > -pastBufferMs && timeToNow <= 0) {
        now.push(task)
      } else if (timeToNow > 0 && timeToNow <= todayMs) {
        today.push(task)
      } else if (timeToNow > todayMs && timeToNow <= tomorrowMs) {
        tomorrow.push(task)
      } else if (timeToNow > tomorrowMs && timeToNow <= thisWeekMs) {
        thisWeek.push(task)
      } else if (timeToNow > thisWeekMs && timeToNow <= nextWeekMs) {
        nextWeek.push(task)
      } else if (timeToNow > nextWeekMs && timeToNow <= thisMonthMs) {
        thisMonth.push(task)
      } else if (timeToNow > thisMonthMs && timeToNow <= nextMonthMs) {
        nextMonth.push(task)
      } else if (timeToNow > nextMonthMs && timeToNow <= thisYearMs) {
        thisYear.push(task)
      } else {
        eventually.push(task)
      }
    })

    past.reverse()

    let renderedCalendarList

    if (
      overdue.length +
        now.length +
        today.length +
        tomorrow.length +
        thisWeek.length +
        nextWeek.length +
        thisMonth.length +
        nextMonth.length +
        thisYear.length +
        eventually.length <
      1
    ) {
      renderedCalendarList = (
        <div className={'results'}>
          <div className={'results empty'}>
            There are no upcoming events. Click &#x22EE;&#8594;schedule event on
            a card to create an event.
          </div>
          {past.length >= 1 ? (
            <AoStack
              cards={past}
              cardStyle={'priority'}
              descriptor={{ singular: 'past event', plural: 'past events' }}
              noFirstCard={true}
            />
          ) : (
            ''
          )}
        </div>
      )
    } else {
      renderedCalendarList = (
        <div className={'results'}>
          {overdue.length >= 1 ? <h2>Overdue</h2> : ''}
          <AoStack
            cards={overdue}
            cardStyle={'priority'}
            alwaysShowAll={true}
          />
          {now.length >= 1 ? <h2>Now</h2> : ''}
          <AoStack cards={now} cardStyle={'priority'} alwaysShowAll={true} />
          {today.length >= 1 ? <h2>Today</h2> : ''}
          <AoStack cards={today} cardStyle={'priority'} alwaysShowAll={true} />
          {tomorrow.length >= 1 ? <h2>Tomorrow</h2> : ''}
          <AoStack
            cards={tomorrow}
            cardStyle={'priority'}
            alwaysShowAll={true}
          />
          {thisWeek.length >= 1 ? <h2>This Week</h2> : ''}
          <AoStack
            cards={thisWeek}
            cardStyle={'priority'}
            alwaysShowAll={true}
          />
          {nextWeek.length >= 1 ? <h2>Next Week</h2> : ''}
          <AoStack
            cards={nextWeek}
            cardStyle={'priority'}
            alwaysShowAll={false}
          />
          <div className={'agendaTail'}>
            <AoStack
              cards={thisMonth}
              cardStyle={'priority'}
              alwaysShowAll={false}
              descriptor={{ singular: 'This Month', plural: 'This Month' }}
              noFirstCard={true}
            />
            <AoStack
              cards={nextMonth}
              cardStyle={'priority'}
              alwaysShowAll={false}
              descriptor={{ singular: 'Next Month', plural: 'Next Month' }}
              noFirstCard={true}
            />
            <AoStack
              cards={thisYear}
              cardStyle={'priority'}
              alwaysShowAll={false}
              descriptor={{ singular: 'This Year', plural: 'This Year' }}
              noFirstCard={true}
            />
            <AoStack
              cards={eventually}
              cardStyle={'priority'}
              alwaysShowAll={false}
              descriptor={{ singular: 'Eventually', plural: 'Eventually' }}
            />
            <AoStack
              cards={past}
              cardStyle={'priority'}
              descriptor={{ singular: 'past event', plural: 'past events' }}
              noFirstCard={true}
            />
          </div>
        </div>
      )
    }

    const nowPlusSoon = overdue.concat(now, today)
    const renderedBadge =
      nowPlusSoon.length >= 1 ? (
        <React.Fragment>
          {overdue.length >= 1 ? overdue.length : nowPlusSoon.length.toString()}
          <div style={{ fontSize: '0.75em' }}>
            {overdue.length >= 1
              ? 'overdue'
              : formatDistanceToNow(nowPlusSoon[0].book.startTs, {
                  addSuffix: true
                })}
          </div>
        </React.Fragment>
      ) : (
        undefined
      )

    return (
      <div id={'calendar'}>
        <AoPopupPanel
          iconSrc={Timecube}
          tooltipText={'Calendar'}
          badge={renderedBadge}
          tooltipPlacement={'right'}
          panelPlacement={'right'}>
          {renderedCalendarList}
        </AoPopupPanel>
      </div>
    )
  }
}

export default withUseStore(AoCalendar)