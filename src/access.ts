export type AppRole="admin"|"operations"|"finance"|"quality"|"viewer";

const access:Record<string,AppRole[]|"all">={
  "/":"all",
  "/timeline":"all",
  "/plantas":"all",
  "/lineas":"all",
  "/operacion-2025":"all",
  "/recepciones":"all",
  "/despachos-ventas":"all",
  "/ordenes-venta":["admin","operations","finance","viewer"],
  "/inventario":"all",
  "/cierre-diario":["admin","operations","finance","viewer"],
  "/aprobaciones":["admin","operations","finance","quality"],
  "/creditos":["admin","finance","operations"],
  "/liquidaciones":["admin","finance","operations"],
  "/importaciones":["admin","operations"],
  "/operadores":["admin","operations"],
  "/modulos":["admin","operations"],
};

export function canAccessPath(role:AppRole,path:string){
  const key=Object.keys(access).filter(candidate=>candidate==="/"?path==="/":path===candidate||path.startsWith(`${candidate}/`)).sort((a,b)=>b.length-a.length)[0];
  if(!key)return false;
  const roles=access[key];
  return roles==="all"||roles.includes(role);
}

export function canCreateReception(role:AppRole){
  return ["admin","operations","quality"].includes(role);
}
