import {OperationalHealthPanel} from '../components/OperationalHealthPanel'
import {PageHeader} from '../components/PageHeader'

export function Observability(){return <><PageHeader eyebrow="Control plane" title="Observabilidad y alertas" description="Estado vivo de fuentes canónicas, trazabilidad física, Vision, procesos de erizo y comunicaciones. Muestra excepciones accionables sin convertir ausencia de evidencia en hechos."/><OperationalHealthPanel expanded/></>}
