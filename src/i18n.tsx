import {createContext,useContext,type ReactNode} from 'react'

export type Locale='es'|'en'

type CopyKey=
 |'loading.module'|'loading.session'|'loading.receptions'
 |'nav.today'|'nav.plants'|'nav.operation'|'nav.commercial'|'nav.intelligence'|'nav.admin'
 |'nav.overview'|'nav.reception'|'nav.production'|'nav.process'|'nav.packing'|'nav.inventory'|'nav.cold'
 |'nav.orders'|'nav.dispatch'|'nav.settlement'|'nav.ask'|'nav.investigate'|'nav.decide'|'nav.history'
 |'role.admin'|'role.operations'|'role.finance'|'role.quality'|'role.viewer'
 |'shell.todayContext'|'shell.checking'|'shell.active'|'shell.review'|'shell.syncing'|'shell.databaseConnected'|'shell.databasePending'|'shell.session'
 |'shell.plantFlow'|'shell.operationalFlow'|'shell.commercialFlow'|'shell.intelligenceFlow'|'shell.navigation'
 |'shell.skip'|'shell.closeMenu'|'shell.closeNavigation'|'shell.openMenu'|'shell.lightTheme'|'shell.darkTheme'|'shell.logout'|'shell.newReception'
 |'auth.eyebrow'|'auth.title'|'auth.description'|'auth.email'|'auth.password'|'auth.enter'|'auth.validating'|'auth.failed'|'auth.tooMany'|'auth.retryMinutes'

const copy:Record<Locale,Record<CopyKey,string>>={
 es:{
  'loading.module':'Cargando módulo…','loading.session':'Validando sesión…','loading.receptions':'Sincronizando recepciones…',
  'nav.today':'Hoy','nav.plants':'Plantas','nav.operation':'Operación','nav.commercial':'Comercial','nav.intelligence':'Inteligencia','nav.admin':'Administración',
  'nav.overview':'Planta','nav.reception':'Recepción','nav.production':'Producción','nav.process':'Proceso','nav.packing':'Packing','nav.inventory':'Inventario','nav.cold':'Frío',
  'nav.orders':'Órdenes','nav.dispatch':'Despacho','nav.settlement':'Liquidación','nav.ask':'Preguntar','nav.investigate':'Investigar','nav.decide':'Decidir','nav.history':'Historia',
  'role.admin':'Administrador','role.operations':'Gerente de Operaciones','role.finance':'Finanzas','role.quality':'Calidad','role.viewer':'Lectura',
  'shell.todayContext':'Estado operativo de hoy','shell.checking':'Verificando','shell.active':'Plataforma activa','shell.review':'Revisar plataforma','shell.syncing':'Sincronizando estado','shell.databaseConnected':'Base de Datos conectada','shell.databasePending':'Base de Datos pendiente','shell.session':'Sesión operativa',
  'shell.plantFlow':'Centro operativo de planta','shell.operationalFlow':'Flujo operativo','shell.commercialFlow':'Flujo comercial','shell.intelligenceFlow':'Flujo de inteligencia','shell.navigation':'Navegación',
  'shell.skip':'Ir al contenido principal','shell.closeMenu':'Cerrar menú','shell.closeNavigation':'Cerrar navegación','shell.openMenu':'Abrir menú','shell.lightTheme':'Cambiar a tema claro','shell.darkTheme':'Cambiar a tema oscuro','shell.logout':'Cerrar sesión','shell.newReception':'+ Nueva recepción',
  'auth.eyebrow':'PESCAMAR · CONTROL OPERACIONAL','auth.title':'Acceso','auth.description':'Ingresa con tu identidad operacional. El sistema limita automáticamente la información y las acciones según tu rol y plantas autorizadas.','auth.email':'Correo','auth.password':'Contraseña','auth.enter':'Entrar','auth.validating':'Validando…','auth.failed':'No fue posible iniciar sesión','auth.tooMany':'Demasiados intentos. Intenta nuevamente más tarde.','auth.retryMinutes':'Demasiados intentos. Intenta nuevamente en {minutes} min.'
 },
 en:{
  'loading.module':'Loading module…','loading.session':'Validating session…','loading.receptions':'Syncing receptions…',
  'nav.today':'Today','nav.plants':'Plants','nav.operation':'Operations','nav.commercial':'Commercial','nav.intelligence':'Intelligence','nav.admin':'Administration',
  'nav.overview':'Plant','nav.reception':'Reception','nav.production':'Production','nav.process':'Process','nav.packing':'Packing','nav.inventory':'Inventory','nav.cold':'Cold chain',
  'nav.orders':'Orders','nav.dispatch':'Dispatch','nav.settlement':'Settlement','nav.ask':'Ask','nav.investigate':'Investigate','nav.decide':'Decide','nav.history':'History',
  'role.admin':'Administrator','role.operations':'Operations Manager','role.finance':'Finance','role.quality':'Quality','role.viewer':'Read only',
  'shell.todayContext':'Today’s operational status','shell.checking':'Checking','shell.active':'Platform active','shell.review':'Review platform','shell.syncing':'Syncing status','shell.databaseConnected':'Database connected','shell.databasePending':'Database pending','shell.session':'Operational session',
  'shell.plantFlow':'Plant operating center','shell.operationalFlow':'Operational flow','shell.commercialFlow':'Commercial flow','shell.intelligenceFlow':'Intelligence flow','shell.navigation':'Navigation',
  'shell.skip':'Skip to main content','shell.closeMenu':'Close menu','shell.closeNavigation':'Close navigation','shell.openMenu':'Open menu','shell.lightTheme':'Switch to light theme','shell.darkTheme':'Switch to dark theme','shell.logout':'Sign out','shell.newReception':'+ New reception',
  'auth.eyebrow':'PESCAMAR · OPERATIONAL CONTROL','auth.title':'Access','auth.description':'Sign in with your operational identity. The system automatically limits information and actions according to your role and authorized plants.','auth.email':'Email','auth.password':'Password','auth.enter':'Sign in','auth.validating':'Validating…','auth.failed':'Unable to sign in','auth.tooMany':'Too many attempts. Try again later.','auth.retryMinutes':'Too many attempts. Try again in {minutes} min.'
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
