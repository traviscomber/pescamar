import {Database,Radio,Scale} from 'lucide-react'
import './data-continuity.css'

type Props={compact?:boolean}

export function DataContinuityBanner({compact=false}:Props){return <section className={`data-continuity-banner${compact?' compact':''}`} aria-label="Origen y continuidad de datos"><div><span className="data-origin canonical"><Database size={14}/><b>Evidencia canónica importada</b></span><small>Planillas históricas y actuales auditadas, con archivo, hash y fila de origen. No equivalen automáticamente a operación live.</small></div><span className="continuity-arrow" aria-hidden="true">→</span><div><span className="data-origin live"><Radio size={14}/><b>Operación registrada en Pescamar</b></span><small>Recepciones y eventos creados dentro de la aplicación, con permisos y trazabilidad operacional.</small></div><span className="continuity-arrow" aria-hidden="true">→</span><div><span className="data-origin derived"><Scale size={14}/><b>Indicadores</b></span><small>Indicadores, scores y conciliaciones se calculan desde ambas capas y se identifican como cálculo o evidencia.</small></div></section>}
