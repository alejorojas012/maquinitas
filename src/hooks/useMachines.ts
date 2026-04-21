import { useState, useEffect } from 'react'
import axios from 'axios'

const isLocal = window.location.hostname === 'localhost'
const BASE = isLocal ? '/api/gw/merchant' : 'https://gb.starthing.com/gw/merchant'

export const HEADERS = {
  'Ram-System': import.meta.env.VITE_RAM_SYSTEM || '1144269879315968000',
  'Ram-Tenant': import.meta.env.VITE_RAM_TENANT || '1405022612241514496',
  'Ram-Token': import.meta.env.VITE_RAM_TOKEN || 'df9a6092108647649aed55ce0e51f55b1495927437289426944',
  'X-Accept-Language': 'es',
}

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
        `${BASE}/equipmentManage/equipmentPage?current=1&size=50&online=&storeShowType=down`,
        { headers: HEADERS }
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
        `${BASE}/statistics/store?current=1&size=50&onlyIncomeData=false&orderMode=INCOME&beginDate=${dateFrom}&endDate=${dateTo}`,
        { headers: HEADERS }
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