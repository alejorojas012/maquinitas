import { useState, useEffect } from 'react'
import axios from 'axios'

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function firstDayOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
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
        '/api/gw/merchant/equipmentManage/equipmentPage?current=1&size=50&online=&storeShowType=down'
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
        `/api/gw/merchant/statistics/store?current=1&size=50&onlyIncomeData=false&orderMode=INCOME&beginDate=${dateFrom}&endDate=${dateTo}`
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

export function useSummary(dateFrom: string, dateTo: string) {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const r = await axios.get(
        `/api/gw/merchant/statistics/summary?current=1&size=10&storeShowType=down&screenShowType=down&onlyIncomeData=false&orderMode=INCOME&beginDate=${dateFrom}&endDate=${dateTo}`
      )
      setSummary(r.data?.body || null)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [dateFrom, dateTo])
  return { summary, loading, error, reload: load }
}

export function useBestStore(dateFrom: string, dateTo: string) {
  const [best, setBest] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await axios.get(
        `/api/gw/merchant/statistics/store?current=1&size=1&onlyIncomeData=false&orderMode=INCOME&beginDate=${dateFrom}&endDate=${dateTo}`
      )
      const records = r.data?.body?.records || []
      setBest(records[0] || null)
    } catch {
      setBest(null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [dateFrom, dateTo])
  return { best, loading }
}

export function useMachineStats() {
  const [machineStats, setMachineStats] = useState<any>({})
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await axios.get('/api/machine-stats')
      setMachineStats(r.data?.stats || {})
    } catch {
      setMachineStats({})
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  return { machineStats, loading, reload: load }
}

export function useActivity() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await axios.get('/api/activity')
      setEvents(r.data?.events || [])
    } catch {
      setEvents([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  return { events, loading, reload: load }
}