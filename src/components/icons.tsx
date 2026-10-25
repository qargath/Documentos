import alFinal from '../../icons/al-final.svg?raw'
import alInicio from '../../icons/al-inicio.svg?raw'
import antes from '../../icons/antes.svg?raw'
import despues from '../../icons/despues.svg?raw'
import deshacer from '../../icons/deshacer.svg?raw'
import rehacer from '../../icons/rehacer.svg?raw'
import restaurar from '../../icons/restaurar.svg?raw'
import descargar from '../../icons/descargar.svg?raw'
import historial from '../../icons/historial.svg?raw'
import importar from '../../icons/importar-file.svg?raw'
import preparar from '../../icons/preparar.svg?raw'
import comprimir from '../../icons/funciones/comprimir.svg?raw'
import convertir from '../../icons/funciones/convertir.svg?raw'
import dividir from '../../icons/funciones/dividir.svg?raw'
import extraer from '../../icons/funciones/extraer-paginas.svg?raw'
import numerar from '../../icons/funciones/numerar-paginas.svg?raw'
import ordenar from '../../icons/funciones/ordenar-paginas.svg?raw'
import proteger from '../../icons/funciones/proteger.svg?raw'
import unir from '../../icons/funciones/unir.svg?raw'
import splitHalf from '../../icons/split-half.svg?raw'
import splitThree from '../../icons/split-three.svg?raw'
import splitFour from '../../icons/split-four.svg?raw'
import splitCustom from '../../icons/split-custom.svg?raw'
import splitClear from '../../icons/split-clear.svg?raw'

export const toolIcons = {
  ordenar,
  dividir,
  unir,
  extraer,
  numerar,
  comprimir,
  convertir,
  proteger,
}

export const actionIcons = {
  alInicio,
  antes,
  despues,
  alFinal,
  deshacer,
  rehacer,
  restaurar,
  importar,
  preparar,
  descargar,
  historial,
}

export const splitIcons = {
  half: splitHalf,
  three: splitThree,
  four: splitFour,
  custom: splitCustom,
  clear: splitClear,
}

export const originalIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`

export const atajosIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`

export function Icon({ svg, className = 'h-[18px] w-[18px]' }: { svg: string; className?: string }) {
  const html = svg.replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
    const cleaned = attrs.replace(/\s(?:width|height)="[^"]*"/g, '')
    return `<svg aria-hidden="true" class="${className}" style="overflow:visible"${cleaned}>`
  })
  return <span className="inline-flex shrink-0" dangerouslySetInnerHTML={{ __html: html }} />
}
