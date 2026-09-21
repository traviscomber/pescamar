import {RefreshCw} from 'lucide-react'
import {useLocale} from '../i18n'

type Plant={id:string;name:string}
type Props={
 date:string
 plantId:string
 plantName:string
 plants:Plant[]
 showAllPlants:boolean
 attention:number
 lots:number
 movements:number
 inventoryLabel:string
 compact?:boolean
 onDate:(value:string)=>void
 onPlant:(value:string)=>void
 onRefresh:()=>void
}

export function HomeHero(props:Props){
 const {t}=useLocale()
 const attentionCopy=props.attention===0?t('home.heroAttentionZero'):t(props.attention===1?'home.heroAttentionOne':'home.heroAttentionMany',{count:props.attention})
 return <section className={`pescamar-home-hero${props.compact?' pescamar-home-hero-compact':''}`} aria-labelledby="pescamar-home-title">
  <div className="pescamar-home-copy">
   <h1 id="pescamar-home-title">{props.compact?t('home.heroTitleCompact'):t('home.heroTitle')}</h1>
   <p className="pescamar-home-date">{props.plantName} · {props.date}</p>
   <p className="pescamar-home-alert"><b>{props.attention||'✓'}</b> {attentionCopy}</p>
   <p className="pescamar-home-sub">{props.compact?t('home.heroSubCompact'):t('home.heroSub')}</p>
   <div className="pescamar-home-actions">
    {!props.compact?<label className="inline-field">{t('home.date')}<input id="home-hero-date" name="homeHeroDate" type="date" value={props.date} onChange={event=>props.onDate(event.target.value)}/></label>:null}
    {(!props.compact||props.showAllPlants)?<label className="inline-field">{t('home.plant')}<select id="home-hero-plant" name="homeHeroPlant" value={props.plantId} onChange={event=>props.onPlant(event.target.value)}>{props.showAllPlants?<option value="">{t('home.allPlants')}</option>:null}{props.plants.map(plant=><option key={plant.id} value={plant.id}>{plant.name}</option>)}</select></label>:null}
    <button className="button secondary" onClick={props.onRefresh} aria-label={t('home.refresh')}><RefreshCw size={15}/></button>
   </div>
  </div>
  {!props.compact?<div className="pescamar-home-stats" aria-label={t('home.operationalStatus')}>
   <div><small>{t('home.heroLots')}</small><b>{props.lots}</b><span>{t('home.liveOperation')}</span></div>
   <div><small>{t('home.heroMovements')}</small><b>{props.movements}</b><span>{t('home.heroFlow')}</span></div>
   <div><small>{t('home.locatedInventory')}</small><b>{props.inventoryLabel}</b><span>{t('home.heroAvailable')}</span></div>
  </div>:null}
 </section>
}
