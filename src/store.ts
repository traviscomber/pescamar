import { useEffect, useState } from 'react'
import { initialLots } from './data'
import type { Lot } from './types'
const STORAGE_KEY = 'n3uralia-unigrade:v1'
function readLots(): Lot[] { try { const saved=localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) as Lot[] : initialLots } catch { return initialLots } }
export function useLots() { const [lots,setLots]=useState<Lot[]>(readLots); useEffect(()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(lots)),[lots]); return { lots, addLot:(lot:Lot)=>setLots(current=>[lot,...current]) } }
