import { useState, useEffect } from 'react'
import axios from 'axios'

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function useMachines() {
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const r = await axios.get(
        '/api/gw/merchant/equipmentManage/equipmentPage?current=1&size=50&online=&storeShowType=0'
      )
      setMachines(r.data?.body?.records || [])
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  return { machines, loading, error, reload: load }
}

export function useStats(dateFrom: string, dateTo: string) {
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const r = await axios.get(
        `/api/gw/merchant/statistics/store?current=1&size=50&onlyIncomeData=false&orderMode=INCOME&dateFrom=${dateFrom}&dateTo=${dateTo}`
      )
      setStats(r.data?.body?.records || [])
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [dateFrom, dateTo])
  return { stats, loading, error, reload: load }
}