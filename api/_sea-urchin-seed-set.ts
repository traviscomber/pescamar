export type SeaUrchinSeedSample={
 photo:number
 sha256:string
 lab:{l:number;a:number;b:number}
 dispersion:number
 chroma:number
 cluster:'saturated_orange'|'light_golden'|'beige_brown'
 recommendedUse:'reference_candidate'|'variability_evidence'
 intakeStatus:'manual_review'
 officialGrade:null
 notes:string
}

// Real Pescamar erizo photos supplied 2026-08-27.
// Immutable lineage is the SHA-256 of the original uploaded image.
// Labels below are analytical clusters only. They are NOT official A-E grades.
export const SEA_URCHIN_REAL_SEED_SET:SeaUrchinSeedSample[]=[
 {photo:1,sha256:'3d642edd333e731a606822e8715009ac2408772552c5092342dadd1b63d21e09',lab:{l:48.2174,a:17.9740,b:50.4255},dispersion:21.8787,chroma:53.53,cluster:'saturated_orange',recommendedUse:'variability_evidence',intakeStatus:'manual_review',officialGrade:null,notes:'Canasto verde, plano cercano. Color fuerte; fondo verde y sombras impiden usarla como referencia maestra sin recaptura estandarizada.'},
 {photo:2,sha256:'49d38e4bf4b8c487dcdaaaab1f88bb4ebbc49dddb068dfbf5f018e50c248d592',lab:{l:51.3097,a:9.0021,b:39.7588},dispersion:16.8219,chroma:40.76,cluster:'beige_brown',recommendedUse:'variability_evidence',intakeStatus:'manual_review',officialGrade:null,notes:'Muchas bandejas. Buena evidencia de variación entre packing; no usar como patrón unitario.'},
 {photo:3,sha256:'680540287c5afc7f79332b9f650effcb66f2d91517832cf835b92d06a23631e3',lab:{l:53.1238,a:13.7152,b:45.4684},dispersion:24.3307,chroma:47.49,cluster:'saturated_orange',recommendedUse:'variability_evidence',intakeStatus:'manual_review',officialGrade:null,notes:'Mesa completa de bandejas. Útil como evidencia de lote y heterogeneidad entre unidades.'},
 {photo:4,sha256:'05c36ed2bbd8b6cbc349a5bc5633213d8643834b8b312cb50067b3f9e9893dff',lab:{l:50.7964,a:11.2881,b:45.5840},dispersion:21.7592,chroma:46.96,cluster:'saturated_orange',recommendedUse:'variability_evidence',intakeStatus:'manual_review',officialGrade:null,notes:'Grupo de bandejas en caja blanca. Buena comparación entre bandejas, aún no patrón maestro.'},
 {photo:5,sha256:'b70e968b1cdc89ce6395120b05aea08c5bd2eb7d1e44ab9130f4d2c9a24e5dc7',lab:{l:60.3216,a:12.3680,b:56.9330},dispersion:20.2546,chroma:58.26,cluster:'light_golden',recommendedUse:'variability_evidence',intakeStatus:'manual_review',officialGrade:null,notes:'Canasto verde rotulado AYIN. Muy luminoso/dorado; fondo verde contamina la calibración.'},
 {photo:6,sha256:'56fc64119c68f71950fa6f1219da7663b497e40919dd115b372f81cc4c36f839',lab:{l:57.1221,a:15.4900,b:43.0639},dispersion:22.3492,chroma:45.77,cluster:'light_golden',recommendedUse:'reference_candidate',intakeStatus:'manual_review',officialGrade:null,notes:'Canasto blanco rotulado 9. Mejor candidata del set para referencia técnica por fondo más neutro, pendiente de grade humano.'},
 {photo:7,sha256:'dc987fe549987865e035161ea8d0d8f5dad7e67444e4b7d33971317190dae3da',lab:{l:47.6981,a:14.0481,b:39.4215},dispersion:16.6193,chroma:41.84,cluster:'beige_brown',recommendedUse:'reference_candidate',intakeStatus:'manual_review',officialGrade:null,notes:'Bandeja dividida sobre fondo blanco. Muy útil como referencia del rango más oscuro/beige y para homogeneidad.'},
 {photo:8,sha256:'6a9772500be67090257f6e14cd9b1ae12b170e617cceb61597abd0a347bf4844',lab:{l:56.3995,a:10.2573,b:41.3398},dispersion:28.1471,chroma:42.59,cluster:'light_golden',recommendedUse:'variability_evidence',intakeStatus:'manual_review',officialGrade:null,notes:'Bandeja sobre balanza con 122,5 g visible. Evidencia excelente para trazabilidad peso/color; alta dispersión de color, no patrón maestro.'}
]

export function findSeaUrchinSeedSample(hash:string){return SEA_URCHIN_REAL_SEED_SET.find(sample=>sample.sha256===hash)??null}
