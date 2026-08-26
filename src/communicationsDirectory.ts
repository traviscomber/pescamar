export type CommunicationPerson={name:string;source:string;context:string;status:'identificado'|'por confirmar'}
export type CommunicationSource={name:string;category:'operacion'|'calidad'|'produccion'|'abastecimiento'|'comercial'|'logistica'|'finanzas'|'personas'|'otro';plantId:string|null;counterparty:string|null;module:string;signals:string[]}

// Catálogo base levantado exclusivamente desde nombres visibles en los grupos WhatsApp compartidos.
// Los roles personales no se infieren: se mantienen "por confirmar" hasta tener mensajes o ficha validada.
export const communicationPeople:CommunicationPerson[]=[
  {name:'Leyla',source:'Leyla Moldeo pescamar',context:'Moldeo / producción',status:'por confirmar'},
  {name:'Pato Díaz',source:'Pato Diaz/Pescamar',context:'Contacto Pescamar',status:'por confirmar'},
  {name:'César González',source:'Pescamar/Cesar González',context:'Contacto Pescamar',status:'por confirmar'},
  {name:'Paulina',source:'Paulina Pescamar',context:'Contacto Pescamar',status:'por confirmar'},
  {name:'Ed',source:'Pescamar-Ed · Proyecto Pescamar&Ed',context:'Proyecto / coordinación',status:'por confirmar'},
  {name:'Luisa Neira',source:'Pescamar - Luisa Neira spa',context:'Contraparte comercial / abastecimiento',status:'por confirmar'},
]

export const communicationSources:CommunicationSource[]=[
  {name:'Supervisores Pescamar',category:'operacion',plantId:null,counterparty:null,module:'Hoy / Plantas',signals:['estado diario','incidencias','producción','calidad','evidencia fotográfica']},
  {name:'Pescamar Ancud',category:'operacion',plantId:'ancud',counterparty:null,module:'Planta Ancud',signals:['recepción','producción','inventario','incidencias']},
  {name:'despachos pescamar ancud',category:'logistica',plantId:'ancud',counterparty:null,module:'Despachos',signals:['salidas','kilos','documentos','fecha de despacho']},
  {name:'Calidad Erizo Pescamar',category:'calidad',plantId:null,counterparty:null,module:'Calidad / Ficha 360',signals:['materia prima','color','moldeo','rechazo','temperatura']},
  {name:'Leyla Moldeo pescamar',category:'produccion',plantId:null,counterparty:'Leyla',module:'Producción',signals:['moldeo','producto terminado','rendimiento','observaciones']},
  {name:'Guafó/pescamar',category:'abastecimiento',plantId:null,counterparty:'Guafó',module:'Recepciones / Proveedores',signals:['origen','materia prima','kilos','calidad']},
  {name:'Aqua austral/pescamar',category:'abastecimiento',plantId:'aqua-austral',counterparty:'Aqua Austral',module:'Plantas / Proveedores',signals:['producto terminado','inventario','despacho','documentación']},
  {name:'Pescamar - Luisa Neira spa',category:'abastecimiento',plantId:null,counterparty:'Luisa Neira SpA',module:'Proveedores',signals:['oferta','kilos','precio','entrega']},
  {name:'Pescamar - Caleta Corral',category:'abastecimiento',plantId:null,counterparty:'Caleta Corral',module:'Recepciones / Proveedores',signals:['origen','disponibilidad','kilos','fecha']},
  {name:'Pescamar/rio bueno',category:'abastecimiento',plantId:null,counterparty:'Río Bueno',module:'Recepciones / Proveedores',signals:['origen','disponibilidad','kilos','calidad']},
  {name:'Pescamar - Pota Perú',category:'abastecimiento',plantId:null,counterparty:'Pota Perú',module:'Abastecimiento',signals:['producto','volumen','precio','importación']},
  {name:'Pescamar - Queulen Salmón',category:'abastecimiento',plantId:null,counterparty:'Queilen/Queulen Salmón',module:'Abastecimiento',signals:['salmón','volumen','precio','entrega']},
  {name:'Pescamar & Fooden',category:'comercial',plantId:null,counterparty:'Fooden',module:'Órdenes de venta',signals:['producto','precio','volumen','fecha de entrega']},
  {name:'Hanwa/Pescamar',category:'comercial',plantId:null,counterparty:'Hanwa',module:'Órdenes de venta',signals:['cotización','precio','volumen','destino']},
  {name:'Megacarrier&Pescamar',category:'comercial',plantId:null,counterparty:'Megacarrier',module:'Comercial / Logística',signals:['carga','reserva','embarque','estado']},
  {name:'Arrom - Pescamar Chile',category:'comercial',plantId:null,counterparty:'Arrom',module:'Órdenes de venta',signals:['cliente','producto','precio','embarque']},
  {name:'Pescamar - Central Valley',category:'comercial',plantId:null,counterparty:'Central Valley',module:'Órdenes de venta',signals:['producto','precio','volumen','entrega']},
  {name:'Pescamar - Gulf Pacific',category:'comercial',plantId:null,counterparty:'Gulf Pacific',module:'Órdenes de venta',signals:['producto','precio','volumen','destino']},
  {name:'Pescamar & Kingsun foods',category:'comercial',plantId:null,counterparty:'Kingsun Foods',module:'Órdenes de venta',signals:['producto','precio','volumen','embarque']},
  {name:'Pescamar & ProChile',category:'comercial',plantId:null,counterparty:'ProChile',module:'Comercial',signals:['mercado','gestión comercial','ferias','oportunidades']},
  {name:'Pescamar & Supreme Seafood',category:'comercial',plantId:null,counterparty:'Supreme Seafood',module:'Órdenes de venta',signals:['producto','precio','volumen','entrega']},
  {name:'Pescamar - Viking',category:'comercial',plantId:null,counterparty:'Viking',module:'Órdenes de venta',signals:['producto','precio','volumen','destino']},
  {name:'Pescamar Mexico',category:'comercial',plantId:null,counterparty:'Pescamar México',module:'Comercial',signals:['mercado','cliente','producto','precio']},
  {name:'Pescamar Octopus Business',category:'comercial',plantId:null,counterparty:null,module:'Comercial',signals:['pulpo','precio','volumen','mercado']},
  {name:'Product of the sea/Pescamar',category:'comercial',plantId:null,counterparty:'Product of the Sea',module:'Órdenes de venta',signals:['producto','precio','volumen','destino']},
  {name:'Pescamar - Seafich',category:'comercial',plantId:null,counterparty:'Seafich',module:'Órdenes de venta',signals:['producto','precio','volumen','entrega']},
  {name:'Embarques Com. Pescamar',category:'logistica',plantId:null,counterparty:null,module:'Despachos / Embarques',signals:['contenedor','naviera','ETA/ETD','documentación','incidencias']},
  {name:'Coordinación embarque Arrom/Pescamar',category:'logistica',plantId:null,counterparty:'Arrom',module:'Despachos / Embarques',signals:['booking','contenedor','fecha','documentos']},
  {name:'Seafrigo / Pescamar',category:'logistica',plantId:null,counterparty:'Seafrigo',module:'Despachos / Embarques',signals:['frío','carga','almacenaje','embarque']},
  {name:'Temas contables PESCAMAR',category:'finanzas',plantId:null,counterparty:null,module:'Finanzas / Liquidaciones',signals:['factura','pago','cobro','conciliación']},
  {name:'Pato Diaz/Pescamar',category:'personas',plantId:null,counterparty:'Pato Díaz',module:'Personas / Relaciones',signals:['coordinación','acuerdos','pendientes']},
  {name:'Pescamar/Cesar González',category:'personas',plantId:null,counterparty:'César González',module:'Personas / Relaciones',signals:['coordinación','acuerdos','pendientes']},
  {name:'Paulina Pescamar',category:'personas',plantId:null,counterparty:'Paulina',module:'Personas / Relaciones',signals:['coordinación','acuerdos','pendientes']},
  {name:'Pescamar-Ed',category:'personas',plantId:null,counterparty:'Ed',module:'Personas / Proyectos',signals:['coordinación','proyecto','pendientes']},
  {name:'Proyecto Pescamar&Ed',category:'personas',plantId:null,counterparty:'Ed',module:'Personas / Proyectos',signals:['proyecto','hitos','acuerdos','pendientes']},
]
