export type PlantMode='Propia'|'Maquila'|'Maquila y producto terminado'|'Producto terminado'
export type Plant={id:string;name:string;location:string;mode:PlantMode;products:string[];sourceStatus:'unlinked'|'linked'}

// Catálogo operacional por validar. No contiene KPI, alertas ni resultados productivos.
export const plants:Plant[]=[
  {id:'ancud',name:'Planta Ancud',location:'Ancud · Chiloé',mode:'Propia',products:['Erizo congelado'],sourceStatus:'unlinked'},
  {id:'quellon',name:'Planta Quellón',location:'Quellón · Chiloé',mode:'Propia',products:['Desconche de erizo','Erizo terminado','Pulpo','Centolla','Jaiba'],sourceStatus:'unlinked'},
  {id:'iquique',name:'Planta Iquique',location:'Iquique · Sotomayor',mode:'Maquila',products:['Pulpo','Erizo congelado','Erizo fresco','Palometa'],sourceStatus:'unlinked'},
  {id:'piedra-azul',name:'Planta Piedra Azul',location:'Puerto Montt · Los Lagos',mode:'Maquila y producto terminado',products:['Centolla','Salmón Chinook','Corvina'],sourceStatus:'unlinked'},
  {id:'aqua-austral',name:'Planta Aqua Austral',location:'Región de Aysén',mode:'Producto terminado',products:['Merluza austral','Congrio','Salmón de cultivo'],sourceStatus:'unlinked'},
  {id:'natales',name:'Planta Natales',location:'Puerto Natales · Magallanes',mode:'Producto terminado',products:['Erizos','Centolla','Centollón','Ostiones'],sourceStatus:'unlinked'}
]

export const canonicalSource={name:'planilla de produccion 2025.xlsx',period:'03 abr — 24 oct 2025',records:394,status:'Validada · planta pendiente de confirmación'}
