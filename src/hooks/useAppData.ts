import { useContext } from 'react'
import { DataContext, type AppData } from './DataContext'

export function useAppData(): AppData {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
