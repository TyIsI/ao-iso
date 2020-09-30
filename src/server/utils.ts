import { createAoStore, pubState } from '../app/store'

export function buildResCallback(res) {
  return (err, dbResponse) => {
    if (err) {
      res.status(500).send('db err')
    } else {
      res.status(201).send(dbResponse)
    }
  }
}

export function memberFromFob(fob) {
  const aoStore = createAoStore(pubState)();
  let m
  aoStore.members
    .filter(m => m.active > 0)
    .forEach(member => {
      if (member.fob == fob) {
        m = member
      }
    })
  return m
}

export function getResource(resourceId) {
  let resource
  state.serverState.resources.forEach(r => {
    if (r.resourceId == resourceId) {
      resource = r
    }
  })
  return resource
}

