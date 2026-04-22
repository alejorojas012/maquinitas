import { useState, useEffect } from 'react'
import axios from 'axios'

export function today() {
  return new Date().toISOString().slice(0, 10)
}

function getHeaders() {
  return {
    'Ram-System': localStorage.getItem('ram-system') || '1144269879315968000',
    'Ram-Tenant': localStorage.getItem('ram-tenant') || '1405022612241514496',
    'Ram-Token': localStorage.getItem('ram-token') || '',
    'X-Accept-Language': 'es',
  }
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
        `/api/gw/merchant/equipmentManage/equipmentPage?current=1&size=50&online=&storeShowType=down`,
        { headers: getHeaders() }
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
        `/api/gw/merchant/statistics/store?current=1&size=50&onlyIncomeData=false&orderMode=INCOME&beginDate=${dateFrom}&endDate=${dateTo}`,
        { headers: getHeaders() }
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