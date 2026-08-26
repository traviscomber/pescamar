import {Database,Radio,Scale} from 'lucide-react'
import './data-continuity.css'

type Props={compact?:boolean}

export function DataContinuityBanner({compact=false}:Props){return <section className={`data-continuity-banner${compact?' compact':''}`} aria-label="Origen y continuidad de datos"><div><span className="data-origin canonical"><Database size={14}/><b>2025 · Base de Datos Pescamar</b></span><small>Información auditada y trazable. Es la referencia histórica del sistema.</small></div><span className="continuity-arrow" aria-hidden="true">→</span><div><span className="data-origin live"><Radio size={14}/><b>2026+ · Operación viva</b></span><small>Se construye desde cada recepción y evento registrado en este mismo sistema.</small></div><span className="continuity-arrow" aria-hidden="true">→</span><div><span className="data-origin derived"><Scale size={14}/><b>Indicadores</b></span><small>Indicadores y estimaciones se calculan desde la Base de Datos Pescamar y siempre se identifican como cálculo.</small></div></section>}
