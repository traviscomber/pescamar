import {createContext,useContext,type ReactNode} from 'react'

export type Locale='es'|'en'

export const localeTag=(locale:Locale)=>locale==='es'?'es-CL':'en'

type CopyKey=
 |'loading.module'|'loading.session'|'loading.receptions'
 |'nav.today'|'nav.home'|'nav.plants'|'nav.operation'|'nav.commercial'|'nav.intelligence'|'nav.admin'|'nav.quality'|'nav.sales'|'nav.reports'|'nav.settings'
 |'nav.overview'|'nav.reception'|'nav.production'|'nav.process'|'nav.packing'|'nav.pallets'|'nav.inventory'|'nav.cold'
 |'nav.orders'|'nav.dispatch'|'nav.settlement'|'nav.ask'|'nav.investigate'|'nav.decide'|'nav.history'
 |'role.admin'|'role.operations'|'role.finance'|'role.quality'|'role.viewer'
 |'shell.todayContext'|'shell.checking'|'shell.active'|'shell.review'|'shell.syncing'|'shell.databaseConnected'|'shell.databasePending'|'shell.session'
 |'shell.plantFlow'|'shell.operationalFlow'|'shell.commercialFlow'|'shell.intelligenceFlow'|'shell.navigation'
 |'shell.skip'|'shell.closeMenu'|'shell.closeNavigation'|'shell.openMenu'|'shell.lightTheme'|'shell.darkTheme'|'shell.logout'|'shell.newReception'
 |'auth.eyebrow'|'auth.title'|'auth.description'|'auth.email'|'auth.password'|'auth.enter'|'auth.validating'|'auth.failed'|'auth.tooMany'|'auth.retryMinutes'
 |'home.title'|'home.description'|'home.date'|'home.plant'|'home.allPlants'|'home.refresh'|'home.updating'
 |'home.whatHappening'|'home.itemToReview'|'home.itemsToReview'|'home.noTasks'|'home.reviewCopy'|'home.clearCopy'|'home.reviewStatus'|'home.upToDate'
 |'home.whatDo'|'home.startOperation'|'home.startCopy'|'home.registerReception'|'home.next'|'home.owner'|'home.source'|'home.sourceCurrent'
 |'home.available'|'home.currentLots'|'home.lots'|'home.liveOperation'|'home.dayMovements'|'home.receptions'|'home.production'|'home.dispatches'|'home.locatedInventory'|'home.locatedProduct'
 |'home.attention'|'home.reviewThese'|'home.nothingNeeds'|'home.noAlerts'|'home.historyIsolation'|'home.consultation'|'home.viewHistory'|'home.viewReports'|'home.askAssistant'|'home.historyCaveat'
 |'home.currentLot'|'home.open'|'home.ownerCommercial'|'home.ownerOperations'|'home.actionQuality'|'home.actionOrder'|'home.actionCost'|'home.readError'|'home.readDayError'

const copy:Record<Locale,Record<CopyKey,string>>={
 es:{
  'loading.module':'Cargando módulo…','loading.session':'Validando sesión…','loading.receptions':'Sincronizando recepciones…',
  'nav.today':'Inicio','nav.home':'Inicio','nav.plants':'Plantas','nav.operation':'Operación','nav.commercial':'Ventas','nav.intelligence':'Asistente','nav.admin':'Configuración','nav.quality':'Calidad','nav.sales':'Ventas','nav.reports':'Reportes y cierre','nav.settings':'Configuración',
  'nav.overview':'Planta','nav.reception':'Recepción','nav.production':'Producción','nav.process':'Proceso','nav.packing':'Packing','nav.pallets':'Pallets','nav.inventory':'Inventario','nav.cold':'Frío',
  'nav.orders':'Órdenes','nav.dispatch':'Despacho','nav.settlement':'Liquidación','nav.ask':'Preguntar','nav.investigate':'Investigar','nav.decide':'Decidir','nav.history':'Historial',
  'role.admin':'Administrador','role.operations':'Gerente de Operaciones','role.finance':'Finanzas','role.quality':'Calidad','role.viewer':'Solo lectura',
  'shell.todayContext':'Inicio','shell.checking':'Verificando','shell.active':'Plataforma activa','shell.review':'Revisar plataforma','shell.syncing':'Sincronizando estado','shell.databaseConnected':'Base de datos conectada','shell.databasePending':'Base de datos pendiente','shell.session':'Sesión operativa',
  'shell.plantFlow':'Trabajo de planta','shell.operationalFlow':'Trabajo operativo','shell.commercialFlow':'Ventas y despacho','shell.intelligenceFlow':'Análisis','shell.navigation':'Navegación',
  'shell.skip':'Ir al contenido principal','shell.closeMenu':'Cerrar menú','shell.closeNavigation':'Cerrar navegación','shell.openMenu':'Abrir menú','shell.lightTheme':'Cambiar a tema claro','shell.darkTheme':'Cambiar a tema oscuro','shell.logout':'Cerrar sesión','shell.newReception':'+ Nueva recepción',
  'auth.eyebrow':'PESCAMAR · CONTROL OPERACIONAL','auth.title':'Acceso','auth.description':'Ingresa con tu identidad operacional. El sistema limita automáticamente la información y las acciones según tu rol y las plantas autorizadas.','auth.email':'Correo','auth.password':'Contraseña','auth.enter':'Entrar','auth.validating':'Validando…','auth.failed':'No fue posible iniciar sesión','auth.tooMany':'Demasiados intentos. Intenta nuevamente más tarde.','auth.retryMinutes':'Demasiados intentos. Intenta nuevamente en {minutes} min.',
  'home.title':'Inicio','home.description':'Ve qué está pasando hoy, qué tienes que hacer y dónde continuar.','home.date':'Fecha','home.plant':'Planta','home.allPlants':'Todas las plantas','home.refresh':'Actualizar','home.updating':'Actualizando operación…',
  'home.whatHappening':'Qué está pasando hoy','home.itemToReview':'{count} cosa para revisar','home.itemsToReview':'{count} cosas para revisar','home.noTasks':'Hoy no hay tareas pendientes','home.reviewCopy':'Hay trabajo que requiere revisión. El sistema lo ordena abajo y muestra la siguiente acción.','home.clearCopy':'No hay movimientos nuevos que requieran intervención. Puedes registrar una recepción o consultar el historial.','home.reviewStatus':'por revisar','home.upToDate':'al día',
  'home.whatDo':'Qué tengo que hacer','home.startOperation':'Comenzar una operación','home.startCopy':'Si llega producto, registra primero la recepción. Ese registro inicia la trazabilidad del lote.','home.registerReception':'Registrar recepción','home.next':'Siguiente','home.owner':'Responsable','home.source':'Origen','home.sourceCurrent':'registros del lote y operación actual',
  'home.available':'Qué tengo disponible','home.currentLots':'Lotes actuales','home.lots':'{count} lotes','home.liveOperation':'operación live registrada','home.dayMovements':'Movimientos del día','home.receptions':'{count} recepciones','home.production':'{count} producción','home.dispatches':'{count} despachos','home.locatedInventory':'Inventario ubicado','home.locatedProduct':'producto con ubicación registrada',
  'home.attention':'Qué requiere atención','home.reviewThese':'Revisa primero estos asuntos','home.nothingNeeds':'Nada requiere intervención ahora','home.noAlerts':'Sin alertas actuales','home.historyIsolation':'Los datos históricos siguen disponibles para consulta, pero no se mezclan con la operación de hoy.','home.consultation':'Consulta','home.viewHistory':'Ver historial','home.viewReports':'Ver reportes','home.askAssistant':'Preguntar al asistente','home.historyCaveat':'El historial es referencia de consulta. No se presenta como inventario, venta ni finanzas live.',
  'home.currentLot':'Lote actual','home.open':'Abrir','home.ownerCommercial':'Comercial / administrativo','home.ownerOperations':'Operación','home.actionQuality':'Revisar calidad','home.actionOrder':'Revisar pedido','home.actionCost':'Completar costo','home.readError':'No fue posible construir el estado','home.readDayError':'No fue posible construir el estado del día'
 },
 en:{
  'loading.module':'Loading module…','loading.session':'Validating session…','loading.receptions':'Syncing receptions…',
  'nav.today':'Home','nav.home':'Home','nav.plants':'Plants','nav.operation':'Operations','nav.commercial':'Sales','nav.intelligence':'Assistant','nav.admin':'Settings','nav.quality':'Quality','nav.sales':'Sales','nav.reports':'Reports & close','nav.settings':'Settings',
  'nav.overview':'Plant','nav.reception':'Reception','nav.production':'Production','nav.process':'Process','nav.packing':'Packing','nav.pallets':'Pallets','nav.inventory':'Inventory','nav.cold':'Cold chain',
  'nav.orders':'Orders','nav.dispatch':'Dispatch','nav.settlement':'Settlement','nav.ask':'Ask','nav.investigate':'Investigate','nav.decide':'Decide','nav.history':'History',
  'role.admin':'Administrator','role.operations':'Operations Manager','role.finance':'Finance','role.quality':'Quality','role.viewer':'Read only',
  'shell.todayContext':'Home','shell.checking':'Checking','shell.active':'Platform active','shell.review':'Review platform','shell.syncing':'Syncing status','shell.databaseConnected':'Database connected','shell.databasePending':'Database pending','shell.session':'Operational session',
  'shell.plantFlow':'Plant work','shell.operationalFlow':'Operational work','shell.commercialFlow':'Sales and dispatch','shell.intelligenceFlow':'Analysis','shell.navigation':'Navigation',
  'shell.skip':'Skip to main content','shell.closeMenu':'Close menu','shell.closeNavigation':'Close navigation','shell.openMenu':'Open menu','shell.lightTheme':'Switch to light theme','shell.darkTheme':'Switch to dark theme','shell.logout':'Sign out','shell.newReception':'+ New reception',
  'auth.eyebrow':'PESCAMAR · OPERATIONAL CONTROL','auth.title':'Access','auth.description':'Sign in with your operational identity. The system automatically limits information and actions according to your role and authorized plants.','auth.email':'Email','auth.password':'Password','auth.enter':'Sign in','auth.validating':'Validating…','auth.failed':'Unable to sign in','auth.tooMany':'Too many attempts. Try again later.','auth.retryMinutes':'Too many attempts. Try again in {minutes} min.',
  'home.title':'Home','home.description':'See what is happening today, what needs your attention, and where to continue.','home.date':'Date','home.plant':'Plant','home.allPlants':'All plants','home.refresh':'Refresh','home.updating':'Updating operations…',
  'home.whatHappening':'What is happening today','home.itemToReview':'{count} item to review','home.itemsToReview':'{count} items to review','home.noTasks':'No pending tasks today','home.reviewCopy':'Some work needs review. The system prioritizes it below and shows the next action.','home.clearCopy':'There are no new movements requiring intervention. You can register a reception or review history.','home.reviewStatus':'to review','home.upToDate':'up to date',
  'home.whatDo':'What I need to do','home.startOperation':'Start an operation','home.startCopy':'When product arrives, register the reception first. That record starts the lot traceability chain.','home.registerReception':'Register reception','home.next':'Next','home.owner':'Owner','home.source':'Source','home.sourceCurrent':'current lot and operational records',
  'home.available':'What I have available','home.currentLots':'Current lots','home.lots':'{count} lots','home.liveOperation':'recorded live operation','home.dayMovements':'Today’s movements','home.receptions':'{count} receptions','home.production':'{count} production','home.dispatches':'{count} dispatches','home.locatedInventory':'Located inventory','home.locatedProduct':'product with a recorded location',
  'home.attention':'What needs attention','home.reviewThese':'Review these first','home.nothingNeeds':'Nothing needs intervention now','home.noAlerts':'No current alerts','home.historyIsolation':'Historical data remains available for reference, but is not mixed with today’s live operation.','home.consultation':'Reference','home.viewHistory':'View history','home.viewReports':'View reports','home.askAssistant':'Ask the assistant','home.historyCaveat':'History is reference data. It is not presented as live inventory, sales, or finance.',
  'home.currentLot':'Current lot','home.open':'Open','home.ownerCommercial':'Commercial / administrative','home.ownerOperations':'Operations','home.actionQuality':'Review quality','home.actionOrder':'Review order','home.actionCost':'Complete cost','home.readError':'Unable to build the operational status','home.readDayError':'Unable to build today’s operational status'
 }
}

type LocaleContextValue={locale:Locale;t:(key:CopyKey,vars?:Record<string,string|number>)=>string}
const LocaleContext=createContext<LocaleContextValue|null>(null)

export function localeFromPath(pathname:string):Locale|null{
 const first=pathname.split('/').filter(Boolean)[0]
 return first==='en'||first==='es'?first:null
}

export function LocaleProvider({locale,children}:{locale:Locale;children:ReactNode}){
 const t=(key:CopyKey,vars?:Record<string,string|number>)=>{
  let value=copy[locale][key]
  if(vars)for(const [name,replacement] of Object.entries(vars))value=value.replace(`{${name}}`,String(replacement))
  return value
 }
 return <LocaleContext.Provider value={{locale,t}}>{children}</LocaleContext.Provider>
}

export function useLocale(){
 const value=useContext(LocaleContext)
 if(!value)throw new Error('LocaleProvider required')
 return value
}
