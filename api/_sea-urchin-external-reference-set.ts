export type SeaUrchinExternalReference={
  id:string
  title:string
  sourcePage:string
  sourceType:'public_domain'|'creative_commons'|'official_reference'
  license:string
  attribution:string|null
  scene:'pre_shipment_tray'|'sashimi'|'sushi'|'shell'|'mixed_product'
  intendedUse:'visual_variability'|'segmentation_qa'|'reference_only'
  qualityStatus:'unlabeled'
  officialGrade:null
  notes:string
}

// External real-image references curated for Uni Vision QA and visual variability.
// They are NOT operational Pescamar evidence and MUST NOT be treated as human quality labels.
// A/B/C/D/E, good/bad, origin, species and commercial release remain null until supported
// by provenance and an explicit human Quality decision inside the operational workflow.
export const SEA_URCHIN_EXTERNAL_REFERENCE_SET:SeaUrchinExternalReference[]=[
  {
    id:'commons-uni-no-sashimi',
    title:'Uni-no-Sashimi.JPG',
    sourcePage:'https://commons.wikimedia.org/wiki/File:Uni-no-Sashimi.JPG',
    sourceType:'public_domain',
    license:'Public domain (PD-self)',
    attribution:'Qwert1234',
    scene:'pre_shipment_tray',
    intendedUse:'segmentation_qa',
    qualityStatus:'unlabeled',
    officialGrade:null,
    notes:'Preparado de uni previo a despacho. Útil para segmentación de roe en bandeja; no usar como patrón de calidad sin validación humana.'
  },
  {
    id:'commons-uniryori',
    title:'Uniryori.jpg',
    sourcePage:'https://commons.wikimedia.org/wiki/File:Uniryori.jpg',
    sourceType:'public_domain',
    license:'Public domain (PD-self)',
    attribution:'FITM',
    scene:'sashimi',
    intendedUse:'visual_variability',
    qualityStatus:'unlabeled',
    officialGrade:null,
    notes:'Uni servido como sashimi. Aporta variación de iluminación/presentación; no es evidencia de planta.'
  },
  {
    id:'commons-huevas-concha',
    title:'Huevas de erizo servidas en la concha.jpg',
    sourcePage:'https://commons.wikimedia.org/wiki/File:Huevas_de_erizo_servidas_en_la_concha.jpg',
    sourceType:'creative_commons',
    license:'Creative Commons per file page; verify exact terms before redistribution',
    attribution:'Wilfredor',
    scene:'shell',
    intendedUse:'visual_variability',
    qualityStatus:'unlabeled',
    officialGrade:null,
    notes:'Roe servido en concha. Útil para robustez frente a fondo/forma no industrial.'
  },
  {
    id:'commons-uni-gunkan',
    title:'Uni gunkan-maki.jpg',
    sourcePage:'https://commons.wikimedia.org/wiki/File:Uni_gunkan-maki.jpg',
    sourceType:'creative_commons',
    license:'CC BY 3.0',
    attribution:'Schellack at English Wikipedia',
    scene:'sushi',
    intendedUse:'visual_variability',
    qualityStatus:'unlabeled',
    officialGrade:null,
    notes:'Uni gunkan-maki. Útil como negativo contextual para evitar confundir arroz/nori con roe.'
  },
  {
    id:'commons-sushi-uni',
    title:'Sushi uni.jpg',
    sourcePage:'https://commons.wikimedia.org/wiki/File:Sushi_uni.jpg',
    sourceType:'creative_commons',
    license:'CC BY-SA 3.0 / GFDL',
    attribution:'Anonymous Powered / self-published work',
    scene:'sushi',
    intendedUse:'visual_variability',
    qualityStatus:'unlabeled',
    officialGrade:null,
    notes:'Uni nigirizushi. Variación de forma, iluminación y entorno de servicio.'
  },
  {
    id:'commons-ezo-bafun-1774',
    title:'Sushi Saito IMG 1774 (23776719666).jpg',
    sourcePage:'https://commons.wikimedia.org/wiki/File:Sushi_Saito_IMG_1774_(23776719666).jpg',
    sourceType:'creative_commons',
    license:'Creative Commons per file page',
    attribution:'City Foodsters',
    scene:'sushi',
    intendedUse:'visual_variability',
    qualityStatus:'unlabeled',
    officialGrade:null,
    notes:'Fuente describe Ezo bafun uni; la especie no debe inferirse para otras imágenes.'
  },
  {
    id:'commons-ezo-bafun-1780',
    title:'Sushi Saito IMG 1780 (23776718626).jpg',
    sourcePage:'https://commons.wikimedia.org/wiki/File:Sushi_Saito_IMG_1780_(23776718626).jpg',
    sourceType:'creative_commons',
    license:'Creative Commons per file page',
    attribution:'City Foodsters',
    scene:'sushi',
    intendedUse:'visual_variability',
    qualityStatus:'unlabeled',
    officialGrade:null,
    notes:'Segunda vista de Ezo bafun uni para variación intra-producto; sin Grade humano Pescamar.'
  },
  {
    id:'maff-hamanaka-135',
    title:'Hamanaka Youshoku Uni',
    sourcePage:'https://www.maff.go.jp/e/policies/intel/gi_act/register/s135.html',
    sourceType:'official_reference',
    license:'MAFF terms apply; reference-only until reuse terms are confirmed',
    attribution:'Ministry of Agriculture, Forestry and Fisheries of Japan',
    scene:'mixed_product',
    intendedUse:'reference_only',
    qualityStatus:'unlabeled',
    officialGrade:null,
    notes:'Referencia oficial de producto Hamanaka. Útil para QA comparativa; no convertir características de la ficha en labels extraídos de la foto.'
  }
]
