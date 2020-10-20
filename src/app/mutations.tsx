import _ from 'lodash'
import * as calculations from './calculations'

function aoMuts(aos, ev) {
  switch (ev.type) {
    case 'ao-linked':
      aos.forEach((ao, i) => {
        if (ao.address === ev.address) {
          ao.links.push(ev.taskId)
        }
      })
      break
    case 'ao-inbound-connected':
      let inAddressConnect = aos.some(a => {
        if (a.address === ev.address) {
          a.inboundSecret = ev.secret
          a.lastContact = Date.now()
          return true
        }
      })
      if (!inAddressConnect) {
        let newEv = {
          address: ev.address,
          outboundSecret: false,
          inboundSecret: ev.secret,
          lastContact: Date.now(),
          links: [],
        }
        aos.push(newEv)
      }
      break
    case 'ao-outbound-connected':
      let outAddressConnect = aos.some(a => {
        if (a.address === ev.address) {
          a.outboundSecret = ev.secret
          a.lastContact = Date.now()
          return true
        }
      })
      if (!outAddressConnect) {
        let newEv = {
          address: ev.address,
          outboundSecret: ev.secret,
          inboundSecret: false,
          lastContact: Date.now(),
          links: [],
        }
        aos.push(newEv)
      }
      break
    case 'ao-disconnected':
      aos.forEach((ao, i) => {
        if (ao.address === ev.address) {
          aos.splice(i, 1)
        }
      })
      break
  }
}

function cashMuts(cash, ev) {
  switch (ev.type) {
    case 'ao-named':
      cash.alias = ev.alias
      break
    case 'spot-updated':
      cash.spot = ev.spot
      break
    case 'currency-switched':
      cash.currency = ev.currency
      break
    case 'rent-set':
      cash.rent = parseFloat(ev.amount)
      break
    case 'cap-set':
      cash.cap = ev.amount
      break
    case 'funds-set':
      cash.outputs = ev.outputs
      cash.channels = ev.channels
      break
    case 'task-boosted':
      cash.usedTxIds.push(ev.txid)
      break
    case 'task-boosted-lightning':
      cash.pay_index = ev.pay_index
      break
    case 'get-node-info':
      cash.info = ev.info
      break
  }
}

function membersMuts(members, ev) {
  switch (ev.type) {
    case 'ao-outbound-connected':
      break
    case 'ao-disconnected':
      break
    case 'member-created':
      ev.lastUsed = ev.timestamp
      ev.muted = true
      members.push(ev)
      break
    case 'member-activated':
      members.forEach(member => {
        if (member.memberId === ev.memberId) {
          if (member.active < 0) {
            member.active = -1 * member.active
          } else {
            member.active++
          }
        }
      })
      break
    case 'task-boosted':
      members.forEach(member => {
        if (member.memberId === ev.taskId) {
          if (member.active < 0) {
            member.active = -1 * member.active
          } else {
            member.active++
          }
        }
      })
      break
    case 'task-boosted-lightning':
      members.forEach(member => {
        if (member.memberId === ev.taskId) {
          if (member.active < 0) {
            member.active = -1 * member.active
          } else {
            member.active++
          }
        }
      })
      break
    case 'member-deactivated':
      members.forEach(member => {
        if (member.memberId === ev.memberId) {
          if (member.active >= 0) {
            member.active = -1 * member.active - 1
          }
        }
      })
      break
    case 'member-purged':
      for (let i = members.length - 1; i >= 0; i--) {
        const member = members[i]
        if (member.memberId === ev.memberId) {
          members.splice(i, 1)
        }
      }
      break
    case 'resource-used':
      members.forEach(member => {
        if (member.memberId === ev.memberId) {
          member.lastUsed = ev.timestamp
        }
      })
      break

    case 'member-field-updated':
      members.forEach(member => {
        if (member.memberId === ev.memberId) {
          member[ev.field] = ev.newfield
        }
      })
      break

    case 'member-ticker-set':
      members.forEach(member => {
        if (member.memberId === ev.memberId) {
          if (!member.tickers) {
            member.tickers = []
          }
          if (!ev.symbol || ev.symbol.trim().length < 1) {
            member.tickers.splice(ev.index, 1)
          } else {
            member.tickers[ev.index] = ev.symbol.trim().toLowerCase()
          }
        }
      })
      break

    case 'doge-barked':
      members.forEach(member => {
        // this should only bump up for mutual doges
        if (member.memberId === ev.memberId) {
          member.lastUsed = ev.timestamp
          // then bark
        }
      })
      break

    case 'doge-muted':
      members.forEach(member => {
        if (member.memberId === ev.memberId) {
          member.muted = true
        }
      })
      break

    case 'doge-unmuted':
      members.forEach(member => {
        if (member.memberId === ev.memberId) {
          member.muted = false
        }
      })
      break
  }
}

function resourcesMuts(resources, ev) {
  switch (ev.type) {
    case 'resource-created':
      let resourceIds = resources.map(r => r.resourceId)
      if (resourceIds.indexOf(ev.resourceId) === -1) {
        resources.push(ev)
      } else {
        console.log(
          'BAD data duplicate resource rejected in mutation, dup resource task likely created'
        )
      }
      break
    case 'resource-used':
      resources.forEach(resource => {
        if (resource.resourceId == ev.resourceId) {
          resource.stock -= parseInt(ev.amount)
        }
      })
      break
    case 'resource-purged':
      resources.forEach((r, i) => {
        if (r.resourceId === ev.resourceId) {
          resources.splice(i, 1)
        }
      })
      break
    case 'resource-stocked':
      resources.forEach(resource => {
        if (resource.resourceId == ev.resourceId) {
          resource.stock += parseInt(ev.amount)
        }
      })
      break
    case 'channel-created':
      resources.forEach((r, i) => {
        if (r.resourceId == ev.resourceId) {
          r.pubkey = ev.pubkey
        }
      })
      break
  }
}

function memesMuts(memes, ev) {
  switch (ev.type) {
    case 'meme-added':
      const fileHash = ev.data
      if (
        !memes.some(file => {
          return file.hash === ev.hash
        })
      ) {
        memes.push({
          memeId: ev.taskId,
          filename: ev.filename,
          hash: ev.hash,
          filetype: ev.filetype,
        })
        console.log('added meme file: ', ev.filename)
      } else {
        console.log('meme file already in state: ', ev.filename)
      }
      break
  }
}

function sessionsMuts(sessions, ev) {
  switch (ev.type) {
    case 'session-created':
      let idHasSession = sessions.some(session => {
        // replace that sessions creds,
        let match = false
        if (session.ownerId === ev.ownerId) {
          match = true
          _.merge(session, ev)
        }
        return match // true terminates the some loop & idHasSession->true too
      })

      if (idHasSession) {
        // edited in session
      } else {
        // id didn't previously have session
        sessions.push(ev)
      }
      break
    case 'session-killed':
      sessions.forEach((s, i) => {
        if (s.session == ev.session) {
          _.pullAt(sessions, i)
        }
      })
      break
    case 'ao-outbound-connected':
      sessions.push({
        ownerId: ev.address,
        token: ev.secret,
        session: ev.address,
      })
      break
  }
}

function tasksMuts(tasks, ev) {
  switch (ev.type) {
    case 'highlighted':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          let didUpdateInline = false
          task.highlights.forEach((h, i) => {
            if (h.memberId === ev.memberId) {
              didUpdateInline = true
              if (h.valence === ev.valence) {
                task.highlights.splice(i, 1)
              } else {
                h.valence = ev.valence
              }
            }
          })
          if (!didUpdateInline) {
            task.highlights.push({
              memberId: ev.memberId,
              valence: ev.valence,
            })
          }
        }
      })
      break
    case 'ao-outbound-connected':
      tasks.push(
        calculations.blankCard(ev.address, ev.address, 'purple', ev.timestamp)
      )
      break
    case 'ao-disconnected':
      break
    case 'resource-created':
      tasks.push(
        calculations.blankCard(
          ev.resourceId,
          ev.resourceId,
          'red',
          ev.timestamp
        )
      )
      break
    case 'member-created':
      tasks.push(
        calculations.blankCard(ev.memberId, ev.memberId, 'blue', ev.timestamp)
      )
      break
    case 'member-purged':
      break

    case 'meme-added':
      tasks.push(
        calculations.blankCard(ev.taskId, ev.filename, 'yellow', ev.timestamp)
      )
      break
    case 'task-created':
      tasks.push(
        calculations.blankCard(
          ev.taskId,
          ev.name,
          ev.color,
          ev.timestamp,
          ev.deck,
          ev.inId ? [ev.inId] : []
        )
      )
      tasks.forEach(task => {
        if (task.taskId === ev.inId) {
          if (ev.prioritized) {
            task.priorities = _.filter(task.subTasks, tId => tId !== ev.taskId)
            task.priorities.push(ev.taskId)
          } else {
            task.subTasks = _.filter(task.subTasks, tId => tId !== ev.taskId)
            task.subTasks.push(ev.taskId)
          }
        }
      })
      break
    case 'address-updated':
      tasks.forEach(t => {
        if (t.taskId === ev.taskId) {
          t.address = ev.address
        }
      })
      break
    case 'task-passed':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          let pass = [ev.fromMemberId, ev.toMemberId]

          if (
            !task.passed.some(p => {
              if (p[0] === pass[0] && p[1] === pass[1]) {
                return true
              }
            })
          ) {
            task.passed.push(pass)
          }
        }
      })
      break
    case 'task-grabbed':
      // First make sure they have a valid member card to grab with,
      // since it will show up on the "Where is this card" list
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          task.passed = _.filter(task.passed, d => d[1] !== ev.memberId)
          if (task.deck.indexOf(ev.memberId) === -1) {
            if (ev.taskId !== ev.memberId && ev.memberId) {
              task.deck.push(ev.memberId)
            }
          }
        }
      })
      break
    case 'task-seen':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          if (!task.seen) {
            task.seen = []
          }
          if (
            !task.seen.some(t => {
              return t.memberId === ev.memberId
            })
          ) {
            task.seen.push({ memberId: ev.memberId, timestamp: Date.now() })
          }
        }
      })
      break
    case 'task-time-clocked':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          let found = task.time.find(t => {
            return t.memberId === ev.memberId
          })
          if (!found) {
            task.time.push({
              memberId: ev.memberId,
              timelog: [ev.seconds],
              date: [ev.date],
            })
          } else {
            if (!found.timelog) {
              found.timelog = []
            }
            if (!found.date) {
              found.date = []
              if (found.timelog.length > found.date.length) {
                let count = found.timelog.length - found.date.length
                while (count > 0) {
                  found.date.push(null)
                  count--
                }
              }
            }
            found.timelog.push(ev.seconds)
            found.date.push(ev.date)
          }
        }
      })
      break
    case 'task-signed':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          task.passed = _.filter(task.passed, d => d[1] !== ev.memberId)
          if (task.deck.indexOf(ev.memberId) === -1) {
            task.deck.push(ev.memberId)
          }
          let newSig = {
            memberId: ev.memberId,
            timestamp: ev.timestamp,
            opinion: ev.opinion,
          }
          if (!task.signed) {
            task.signed = []
          }
          task.signed.push(newSig)
        }
      })
      break
    case 'pile-grabbed':
      if (!ev.memberId) {
        break
      }
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          task.passed = _.filter(task.passed, d => d[1] !== ev.memberId)
          let crawler = [ev.taskId]
          let history = []
          let newCards = []
          do {
            newCards = []
            crawler = crawler.forEach(t => {
              if (history.indexOf(t) >= 0) return
              let subTask = tasks.filter(pst => pst.taskId === t)
              if (subTask.length < 1) {
                // console.log(
                //   'missing subtask, this is messy. parent task name: ',
                //   task.name
                // )
                return
              }
              if (subTask.length > 1) {
                console.log('duplicate task found, this is very bad')
              }
              subTask = subTask[0]
              if (
                subTask === undefined ||
                subTask.subTasks === undefined ||
                subTask.priorities === undefined ||
                subTask.completed === undefined
              ) {
                console.log('invalid task data found, this is very bad')
                return
              }

              history.push(t)

              if (
                subTask.deck.indexOf(ev.memberId) === -1 &&
                ev.taskId !== ev.memberId
              ) {
                subTask.passed = _.filter(
                  subTask.passed,
                  d => d[1] !== ev.memberId
                )
                subTask.deck.push(ev.memberId)
              }
              newCards = newCards
                .concat(subTask.subTasks)
                .concat(subTask.priorities)
                .concat(subTask.completed)
            })
            crawler = newCards
          } while (crawler.length > 0)
        }
      })
      break
    case 'task-dropped':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          task.deck = _.filter(task.deck, d => d !== ev.memberId)
          task.passed = _.filter(task.passed, d => d[1] !== ev.memberId)
        }
      })
      break
    case 'pile-dropped':
      if (!ev.memberId) {
        break
      }
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          task.passed = _.filter(task.passed, d => d[1] !== ev.memberId)
          let crawler = [ev.taskId]
          let history = []
          let newCards = []
          do {
            newCards = []
            crawler = crawler.forEach(t => {
              if (history.indexOf(t) >= 0) return
              let subTask = tasks.filter(pst => pst.taskId === t)
              if (subTask.length < 1) {
                console.log('missing subtask, this is messy')
                return
              }
              if (subTask.length > 1) {
                console.log('duplicate task found, this is very bad')
              }
              subTask = subTask[0]
              if (
                subTask === undefined ||
                subTask.subTasks === undefined ||
                subTask.priorities === undefined ||
                subTask.completed === undefined
              ) {
                console.log('invalid task data found, this is very bad')
                return
              }

              history.push(t)

              if (
                subTask.deck.indexOf(ev.memberId) >= 0 &&
                ev.taskId !== ev.memberId
              ) {
                subTask.passed = _.filter(
                  subTask.passed,
                  d => d[1] !== ev.memberId
                )
                subTask.deck = _.filter(subTask.deck, d => d !== ev.memberId)
              }
              newCards = newCards
                .concat(subTask.subTasks)
                .concat(subTask.priorities)
                .concat(subTask.completed)
            })
            crawler = newCards
          } while (crawler.length > 0)
        }
      })
      break
    case 'member-purged':
      for (let i = tasks.length - 1; i >= 0; i--) {
        const task = tasks[i]
        if (task.taskId === ev.memberId) {
          tasks.splice(i, 1)
        }
      }
      tasks.forEach(t => {
        t.subTasks = t.subTasks.filter(st => st !== ev.memberId)
        t.priorities = t.priorities.filter(st => st !== ev.memberId)
        t.completed.filter(st => st !== ev.memberId)
        t.claimed = t.claimed.filter(st => st !== ev.memberId)
        t.deck = t.deck.filter(st => st !== ev.memberId)
        t.passed = t.passed.filter(
          p => !(p[0] === ev.memberId || p[1] === ev.memberId)
        )
        if (_.has(t, 'grid.rows')) {
          Object.entries(t.grid.rows).forEach(([y, row]) => {
            Object.entries(row).forEach(([x, cell]) => {
              if (cell === ev.memberId) {
                delete tasks[j].grid.rows[y][x]
              }
            })
            if (row.length === 0) {
              delete tasks[j].grid.rows[y]
            }
          })
        }
      })
      break
    case 'task-removed':
      for (let i = tasks.length - 1; i >= 0; i--) {
        const task = tasks[i]
        if (task.taskId === ev.taskId) {
          tasks.splice(i, 1)
        }
      }
      tasks.forEach((t, i) => {
        t.subTasks = t.subTasks.filter(st => st !== ev.taskId)
        t.priorities = t.priorities.filter(st => st !== ev.taskId)
        t.completed = _.filter(t.completed, st => st !== ev.taskId)
        if (_.has(t, 'grid.rows')) {
          Object.entries(t.grid.rows).forEach(([y, row]) => {
            Object.entries(row).forEach(([x, cell]) => {
              if (cell === ev.taskId) {
                delete tasks[i].grid.rows[y][x]
              }
            })
            if (row.length === 0) {
              delete tasks[i].grid.rows[y]
            }
          })
        }
      })
      break
    case 'tasks-removed':
      for (let i = tasks.length - 1; i >= 0; i--) {
        const task = tasks[i]
        if (ev.taskIds.includes(task.taskId)) {
          tasks.splice(i, 1)
        }
      }
      tasks.forEach((t, i) => {
        t.subTasks = t.subTasks.filter(st => !ev.taskIds.includes(st))
        t.priorities = t.priorities.filter(st => !ev.taskIds.includes(st))
        t.completed = _.filter(t.completed, st => !ev.taskIds.includes(st))
        if (_.has(t, 'grid.rows')) {
          Object.entries(t.grid.rows).forEach(([y, row]) => {
            Object.entries(row).forEach(([x, cell]) => {
              if (ev.taskIds.includes(cell)) {
                delete tasks[i].grid.rows[y][x]
              }
            })
            if (row.length === 0) {
              delete tasks[i].grid.rows[y]
            }
          })
        }
      })
      break
    case 'task-prioritized':
      tasks.forEach(task => {
        if (task.taskId === ev.inId) {
          task.priorities = _.filter(
            task.priorities,
            taskId => taskId !== ev.taskId
          )
          task.subTasks = _.filter(
            task.subTasks,
            taskId => taskId !== ev.taskId
          )
          task.completed = _.filter(
            task.completed,
            taskId => taskId !== ev.taskId
          )
          // if (ev.position) {
          //   task.priorities = task.priorities.splice(ev.position, 0, ev.taskId)
          // } else {
          // console.log('task-prioritized position is ', ev.position)
          task.priorities.push(ev.taskId)
          // }
        }
        if (task.taskId === ev.taskId) {
          if (!_.has(task, 'parents') || !Array.isArray(task.parents)) {
            task.parents = []
          }

          if (!task.parents.some(pId => pId === ev.inId)) {
            task.parents.push(ev.inId)
          }
        }
      })
      break
    case 'pile-prioritized':
      tasks.forEach(task => {
        if (task.taskId === ev.inId) {
          task.priorities = task.priorities.concat(task.subTasks)
          task.subTasks = []
        }
      })
      break
    case 'task-refocused':
      let claimed
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          claimed = task.claimed
        }
      })
      tasks.forEach(task => {
        if (task.taskId === ev.inId) {
          task.priorities = _.filter(
            task.priorities,
            taskId => taskId !== ev.taskId
          )
          task.subTasks = _.filter(
            task.subTasks,
            taskId => taskId !== ev.taskId
          )
          if (claimed && claimed.length >= 1) {
            if (
              !task.completed.some(tId => {
                return tId === ev.taskId
              })
            ) {
              task.completed.push(ev.taskId)
            }
          } else if (claimed !== undefined) {
            task.subTasks.push(ev.taskId)
          }
        }
      })
      break
    case 'pile-refocused':
      tasks.forEach(task => {
        if (task.taskId === ev.inId) {
          task.priorities.forEach(stId => {
            tasks.forEach(st => {
              if (st.taskId === stId) {
                if (st.claimed && st.claimed.length >= 1) {
                  task.completed.push(stId)
                } else {
                  task.subTasks.push(stId)
                }
              }
            })
            task.priorities = []
          })
        }
      })
      break
    case 'task-sub-tasked':
      // I think the spec is only run on event creation, not load from database,
      // so make sure the task exists before linking to it from another card
      let taskExists = false
      tasks.forEach(task => {
        if (task.taskId === ev.subTask) {
          taskExists = true
          task.passed = _.filter(task.passed, d => d[1] !== ev.memberId)
          if (ev.memberId && task.deck.indexOf(ev.memberId) === -1) {
            if (ev.subTask !== ev.memberId) {
              task.deck.push(ev.memberId)
            }
          }
          if (!_.has(task, 'parents') || !Array.isArray(task.parents)) {
            console.log(
              'Task with missing parents found in task-sub-tasked. This should never happen.'
            )
            task.parents = []
          }

          if (!task.parents.some(pId => pId === ev.taskId)) {
            task.parents.push(ev.taskId)
          }
        }
      })
      if (taskExists) {
        tasks.forEach(task => {
          if (task.taskId === ev.taskId) {
            task.subTasks = _.filter(task.subTasks, tId => tId !== ev.subTask)
            task.subTasks.push(ev.subTask)
          }
        })
      } /*else { */
      // console.log(
      //   'A task with references to subTasks that are missing was found in an event in the database. This should have been filtered before storing.'
      // )
      // }
      break
    case 'task-de-sub-tasked':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          task.passed = _.filter(task.passed, d => d[1] !== ev.memberId)
          task.subTasks = _.filter(task.subTasks, tId => tId !== ev.subTask)
          task.completed = _.filter(task.completed, tId => tId !== ev.subTask)
        }
        if (task.taskId === ev.subTask) {
          task.parents = _.filter(task.parents, tId => tId !== ev.taskId)
        }
      })
      break
    case 'task-guilded':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          task.guild = ev.guild
        }
      })
      break
    case 'task-valued':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          task.completeValue = Number(ev.value)
        }
      })
      break
    case 'task-colored':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          task.color = ev.color
        }
        if (ev.inId && task.taskId === ev.inId) {
          task.subTasks = _.filter(task.subTasks, tId => tId !== ev.taskId)
          task.subTasks.push(ev.taskId)
        }
      })
      break
    case 'task-claimed':
      let bounty = 0
      tasks.forEach(task => {
        // let found = false
        if (task.taskId === ev.memberId) {
          task.boost += parseFloat(ev.paid)
        }

        // task.priorities.some(taskId => {
        //   if (taskId !== ev.taskId) {
        //     return false
        //   } else {
        //     found = true
        //     return true
        //   }
        // })

        // task.subTasks.some(taskId => {
        //   if (taskId !== ev.taskId) {
        //     return false
        //   } else {
        //     found = true
        //     return true
        //   }
        // })

        // if (found) {
        //   if (task.priorities.indexOf(ev.taskId) === -1) {
        //     task.subTasks = _.filter(task.subTasks, tId => tId !== ev.subTask)
        //     task.completed = _.filter(task.completed, tId => tId !== ev.subTask)
        //     task.completed.push(ev.taskId)
        //   }
        // }
        if (task.taskId === ev.taskId) {
          task.passed = _.filter(task.passed, d => d[1] !== ev.memberId)
          if (task.deck.indexOf(ev.memberId) === -1) {
            if (ev.taskId !== ev.memberId && ev.memberId) {
              task.deck.push(ev.memberId)
            }
          }
          if (task.claimed.indexOf(ev.memberId) === -1) {
            task.claimed.push(ev.memberId)
          }
          task.lastClaimed = ev.timestamp
        }
      })
      break
    case 'task-unclaimed':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          task.claimed = task.claimed.filter(mId => mId !== ev.memberId)
          if (task.claimed.length < 1) {
            tasks.forEach(p => {
              if (
                p.priorities.indexOf(ev.taskId) === -1 &&
                p.completed.indexOf(ev.taskId) > -1
              ) {
                p.completed = p.completed.filter(taskId => taskId !== ev.taskId)
                p.subTasks = p.subTasks.filter(taskId => taskId !== ev.taskId)
                p.subTasks.push(ev.taskId)
              }
            })
          }
        }
      })
      break
    case 'task-boosted':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          let amount = parseFloat(ev.amount)
          let boost = parseFloat(task.boost)
          if (amount > 0) {
            task.boost = amount + boost
            task.address = ''
          }
        }
      })
      break
    case 'task-boosted-lightning':
      tasks.forEach(task => {
        if (task.payment_hash === ev.payment_hash) {
          let amount = parseFloat(ev.amount)
          let boost = parseFloat(task.boost)
          if (amount > 0) {
            task.boost = amount + boost
            task.bolt11 = ''
            task.payment_hash = ''
          }
        }
      })
      break
    case 'resource-booked':
      tasks.forEach(task => {
        if (task.taskId === ev.resourceId) {
          task.book = ev
        }
      })
      break
    case 'resource-used':
      tasks.forEach(task => {
        let charged = parseFloat(ev.charged)
        if (charged > 0) {
          if (task.taskId === ev.memberId) {
            task.boost -= charged
          }
          if (task.taskId === ev.resourceId) {
            task.boost += charged
          }
        }
      })
      break
    case 'invoice-created':
      tasks.forEach(task => {
        if (task.taskId === ev.taskId) {
          task.payment_hash = ev.payment_hash
          task.bolt11 = ev.bolt11
        }
      })
      break
    case 'task-swapped':
      let task
      tasks.forEach(t => {
        if (t.taskId === ev.taskId) {
          task = t
        }
      })

      if (task) {
        let originalIndex = task.subTasks.indexOf(ev.swapId1)
        let swapIndex = task.subTasks.indexOf(ev.swapId2)

        let originalIndexCompleted = task.completed.indexOf(ev.swapId1)
        let swapIndexCompleted = task.completed.indexOf(ev.swapId2)

        if (originalIndex > -1 && swapIndex > -1) {
          let newST = task.subTasks.slice()
          newST[originalIndex] = ev.swapId2
          newST[swapIndex] = ev.swapId1
          task.subTasks = newST
        }

        if (originalIndexCompleted > -1 && swapIndexCompleted > -1) {
          let newCompleted = task.completed.slice()
          newCompleted[originalIndexCompleted] = ev.swapId2
          newCompleted[swapIndexCompleted] = ev.swapId1
          task.completed = newCompleted
        }
      }
      break
    case 'task-bumped':
      let taskB
      tasks.forEach(t => {
        if (t.taskId === ev.taskId) {
          taskB = t
        }
      })

      if (taskB) {
        let originalIndex = taskB.subTasks.indexOf(ev.bumpId)
        let originalIndexCompleted = taskB.completed.indexOf(ev.bumpId)
        if (
          originalIndex === taskB.subTasks.length - 1 &&
          ev.direction === -1
        ) {
          let newST = [ev.bumpId]
          newST = newST.concat(
            taskB.subTasks.slice(0, taskB.subTasks.length - 1)
          )
          taskB.subTasks = newST
        }

        if (originalIndex === 0 && ev.direction === 1) {
          let newST = taskB.subTasks.slice(1)
          newST.push(ev.bumpId)
          taskB.subTasks = newST
        }
      }
      break
    case 'tasks-received':
      const startLength = tasks.length
      let changedIndexes = []
      ev.tasks.forEach(newT => {
        if (
          !tasks.some((cur, i) => {
            if (cur.taskId === newT.taskId) {
              calculations.safeMerge(cur, newT)
              changedIndexes.push(i)
              return true
            }
          })
        ) {
          let safeClone = calculations.blankCard(
            newT.taskId,
            newT.name,
            newT.color,
            newT.timestamp,
            newT.parents,
            newT.height
          )
          calculations.safeMerge(safeClone, newT)
          tasks.push(safeClone)
          changedIndexes.push(tasks.length - 1)
        }
      })
      // Loop through the new cards and remove invalid references to cards that don't exist on this server
      changedIndexes.forEach(tId => {
        const t = tasks[tId]
        let beforeLength = t.subTasks.length
        let filtered = []
        t.subTasks = _.filter(t.subTasks, stId => {
          if (tasks.some(sst => sst.taskId === stId)) {
            filtered.push(stId)
            return true
          }
          return false
        })
        t.priorities = t.priorities.filter(stId =>
          tasks.some(sst => sst.taskId === stId)
        )
        t.completed = t.completed.filter(stId =>
          tasks.some(sst => sst.taskId === stId)
        )
        t.deck = t.deck.filter(stId =>
          tasks.some(sst => sst.taskId === stId && sst.taskId === sst.name)
        )
        // Grids are not received yet (because they did not exist when p2p AO was previously implemented)
        // so they do not need to be checked for valid references to other cards (yet)
      })
      break
    case 'member-charged':
      tasks.forEach(task => {
        if (task.taskId === ev.memberId) {
          task.boost -= parseFloat(ev.charged)
          if (task.boost < 0) {
            task.boost = 0
          }
        }
      })
      break
    case 'grid-created':
      tasks.push(
        calculations.blankCard(
          ev.taskId,
          ev.name,
          ev.color,
          ev.timestamp,
          ev.deck,
          ev.height,
          ev.width
        )
      )
      break
    case 'grid-added':
      tasks.forEach((task, i) => {
        if (task.taskId === ev.taskId) {
          task.grid = calculations.blankGrid(ev.height, ev.width)
        }
      })
      break
    case 'grid-resized':
      tasks.forEach((task, i) => {
        if (task.taskId === ev.taskId) {
          if (!task.grid) {
            task.grid = calculations.blankGrid(ev.height, ev.width)
          }
          task.grid.height = ev.height
          task.grid.width = ev.width
          Object.entries(task.grid.rows).forEach(([y, row]) => {
            Object.entries(row).forEach(([x, cell]) => {
              if (x >= ev.width || y >= ev.height) {
                tasks.forEach(st => {
                  if (st.taskId === cell) {
                    task.subTasks = _.filter(
                      task.subTasks,
                      taskId => taskId !== cell
                    )
                    task.completed = _.filter(
                      task.completed,
                      taskId => taskId !== cell
                    )
                    if (st.claimed && st.claimed.length >= 1) {
                      task.completed.push(cell)
                    } else {
                      task.subTasks.unshift(cell)
                    }
                  }
                })
                delete tasks[i].grid.rows[y][x]
              }
            })
            if (row.length === 0) {
              delete tasks[i].grid.rows[y]
            }
          })
        }
      })
      break
    case 'grid-pin':
      tasks.forEach((task, i) => {
        if (task.taskId === ev.inId) {
          if (!task.grid) {
            task.grid = calculations.blankGrid()
          }
          if (!_.has(task, 'grid.rows.' + ev.y)) {
            tasks[i].grid.rows[ev.y] = {}
          }
          tasks[i].grid.rows[ev.y][ev.x] = ev.taskId
        }
        // Same as task-sub-tasked: Grab the card and removed the pass from it, if any. And add parents.
        if (task.taskId === ev.taskId) {
          // task.passed = _.filter(task.passed, d => d[1] !== ev.memberId)
          // if (ev.memberId && task.deck.indexOf(ev.memberId) === -1) {
          //   if (ev.taskId !== ev.memberId) {
          //     task.deck.push(ev.memberId)
          //   }
          // }
          if (!_.has(task, 'parents') || !Array.isArray(task.parents)) {
            task.parents = []
          }
          if (!task.parents.some(pId => pId === ev.inId)) {
            task.parents.push(ev.inId)
          }
        }

        task.subTasks = task.subTasks.filter(st => st !== ev.taskId)
      })
      break
    case 'grid-unpin':
      tasks.some((task, i) => {
        if (task.taskId == ev.inId) {
          if (!_.has(task, 'grid.rows.' + ev.y)) {
            return false
          }
          let gridTaskId = tasks[i].grid.rows[ev.y][ev.x]
          delete tasks[i].grid.rows[ev.y][ev.x]
          if (task.grid.rows[ev.y].length == 0) {
            delete tasks[i].grid.rows[ev.y]
          }
          if (tasks.some(t => t.taskId === gridTaskId)) {
            task.subTasks = task.subTasks.filter(st => st !== gridTaskId)
            task.subTasks.unshift(gridTaskId)
          }
          return true
        }
      })
      break
  }
}

export function applyEvent(state, ev) {
  cashMuts(state.cash, ev)
  membersMuts(state.members, ev)
  resourcesMuts(state.resources, ev)
  memesMuts(state.memes, ev)
  sessionsMuts(state.sessions, ev)
  tasksMuts(state.tasks, ev)
  aoMuts(state.ao, ev)
}

function setCurrentCash(cash, current) {
  cash.alias = current.cash.alias
  cash.address = current.cash.address
  cash.spot = current.cash.spot
  cash.currency = current.cash.currency
  cash.rent = current.cash.rent
  cash.cap = current.cash.cap
  cash.usedTxIds = current.cash.usedTxIds
  cash.outputs = current.cash.outputs
  cash.channels = current.cash.channels
  cash.info = current.cash.info
  cash.pay_index = current.cash.pay_index
}

function setCurrentTasks(tasks, current) {
  tasks.forEach((task, i) => {
    delete tasks[i]
  })
  tasks.length = 0
  current.tasks.forEach(task => {
    tasks.push(task)
    // _.assign(tasks[index].grid, task.grid) // does not solve the +grid not rerendering glitch... or does it?
  })
}

function setCurrentSessions(sessions, current) {
  sessions.length = 0
  current.sessions.forEach(session => {
    sessions.push(session)
  })
}

function setCurrentAO(aos, current) {
  aos.length = 0
  current.ao.forEach(a => {
    aos.push(a)
  })
}

function setCurrentMembers(members, current) {
  members.length = 0
  current.members.forEach(member => {
    members.push(member)
  })
}

function setCurrentResources(resources, current) {
  resources.length = 0
  current.resources.forEach(resource => {
    resources.push(resource)
  })
}

function setCurrentMemes(memes, current) {
  memes.length = 0
  if (!current.memes) {
    current.memes = []
  }
  current.memes.forEach(meme => {
    memes.push(meme)
  })
}

export function setCurrent(state, current) {
  setCurrentCash(state.cash, current)
  setCurrentTasks(state.tasks, current)
  setCurrentSessions(state.sessions, current)
  setCurrentAO(state.ao, current)
  setCurrentMembers(state.members, current)
  setCurrentResources(state.resources, current)
  setCurrentMemes(state.memes, current)
}
