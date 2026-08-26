import {useEffect,useState} from 'react'
import {fetchSharedPlantState} from '../plantApi'
import {plants as configuredPlants,type Plant} from '../plants'

export function usePlants(){const[plants,setPlants]=useState<Plant[]>(configuredPlants),[loading,setLoading]=useState(true),[error,setError]=useState('');useEffect(()=>{let active=true;fetchSharedPlantState().then(state=>{if(!active)return;const live=Array.isArray(state.plants)&&state.plants.length?state.plants:configuredPlants;setPlants(live.filter(plant=>plant.active!==false) as Plant[]);setError('')}).catch(cause=>{if(active){setPlants(configuredPlants);setError(cause instanceof Error?cause.message:'No fue posible cargar plantas')}}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);return{plants,loading,error}}
