import { Cable, Construction } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
export function Placeholder({title,description}:{title:string;description:string}){return <><PageHeader eyebrow="Módulo UniGrade" title={title} description={description}/><div className="panel empty-state"><span><Construction/></span><h2>Módulo preparado para integración</h2><p>La experiencia base está diseñada. El siguiente paso es conectar datos de planta, hardware y reglas operacionales.</p><div><Cable size={17}/> Arquitectura lista para API y eventos en tiempo real</div></div></>}
