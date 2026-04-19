import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [country, setCountry] = useState('hti')
  const [activeAlerts, setActiveAlerts] = useState([])

  const countryName = country === 'hti' ? 'Haiti' : country === 'cod' ? 'DRC' : country.toUpperCase()

  return (
    <AppContext.Provider value={{ country, setCountry, countryName, activeAlerts, setActiveAlerts }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
