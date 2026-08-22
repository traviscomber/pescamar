export type AppRole="admin"|"operations"|"finance"|"quality"|"viewer";

const access:Record<string,AppRole[]|"all">={
  "/":"all",
  "/plantas":"all",
  "/lineas":"all",
  "/operacion-2025":"all",
  "/recepciones":"all",
  "/aprobaciones":["admin","operations","finance","quality"],
  "/creditos":["admin","finance"],
  "/liquidaciones":["admin","finance"],
  "/importaciones":["admin","operations"],
  "/operadores":["admin"],
  "/modulos":["admin"],
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
