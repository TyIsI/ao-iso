import React, { useEffect, ReactElement } from 'react'
import { hydrate } from 'react-dom'
import { BrowserRouter } from 'react-router-dom'
import StyleContext from 'isomorphic-style-loader/StyleContext'
import withStyles from 'isomorphic-style-loader/withStyles'
import styles from './app/css/styles'
import App from './app'
import api from './client/api'
import * as datepickerStyle from 'react-datepicker/dist/react-datepicker.css'
import * as tippyStyle from 'tippy.js/dist/tippy.css'
import * as tippyTranslucentStyle from 'tippy.js/themes/translucent.css'

api.startSocketListeners()

const Routes = (): ReactElement => {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

const insertCss = (...styles) => {
  const removeCss = styles.map(style => style._insertCss())
  return () => removeCss.forEach(dispose => dispose())
}
const StyledRoutes = withStyles(
  styles,
  datepickerStyle,
  tippyStyle,
  tippyTranslucentStyle
)(Routes)

hydrate(
  <StyleContext.Provider value={{ insertCss }}>
    <StyledRoutes />
  </StyleContext.Provider>,
  document.getElementById('root')
)
