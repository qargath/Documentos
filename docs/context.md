# Contexto para desarrollar Document♥s

Guía de quien mantiene el código. La guía de uso está en `README.md`, en la raíz, y no lleva detalles de implementación.

## Producto

Document♥s es un taller de PDF de uso local. El corazón del nombre sustituye a la o final de Documentos. La interfaz va en español neutro.

Los bytes del PDF no salen del navegador. No hay cuenta, ni servidor de archivos, ni telemetría. Docker solo sirve la aplicación ya construida.

Funciones listas: Ordenar páginas, Dividir, Unir. Aparecen en la barra y aún no hacen nada: Extraer páginas, Numerar páginas, Comprimir, Convertir, Proteger.

## Cómo correrla

Hace falta Docker. No instales Node en Windows para construir: el build corre dentro de la imagen.

```bash
docker compose up --build -d
```

Queda en http://localhost:4173. El proyecto de Compose se llama `documentos`, el servicio `web`, y publica `4173:80`.

Tras un cambio de interfaz, vuelve a construir y recarga el navegador. `npm run build` dentro de la imagen ejecuta `tsc --noEmit` y Vite. Antes pasa `node --experimental-strip-types scripts/check.ts`.

En PowerShell no uses `&&`. Encadena con `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`.

`.dockerignore` excluye `*.md`, así que el README no entra en la imagen.

## Stack

React 19, TypeScript, Vite 8 y Tailwind 4. Las miniaturas salen de pdf.js. Las páginas se copian con pdf-lib 1.17.1. El arrastre usa `@dnd-kit`. El productor de los PDF generados es `Document♥s`.

pdf-lib 1.17.1 no cifra ni descifra. Un PDF con contraseña se rechaza con un mensaje en español.

## Un solo documento

Ordenar, Unir y Dividir leen y escriben el mismo estado (`src/document.ts`). No son tres archivos distintos ni un pipeline de pasos obligatorios.

El documento es una lista de archivos de origen y una lista de páginas en orden visual. Cada página sabe de qué archivo sale y cuál es su índice ahí.

- **Unir** muestra los archivos cerrados (`src/components/FileDeck.tsx`). Reordenarlos mueve cada bloque entero y conserva el orden interno de sus hojas.
- **Ordenar páginas** muestra todas las hojas de ese orden. Si cada archivo sigue siendo un tramo continuo, el documento sigue siendo varios archivos y el orden de los bloques se actualiza.
- Si una hoja de un archivo queda entre las de otro, `intactFileOrder` en `src/merge.ts` devuelve null. Entonces se arma un solo PDF con `mergePdfs` y el documento pasa a tener un único archivo. Deshacer restaura los archivos anteriores, porque el historial guarda las referencias a los bytes.
- **Dividir** corta el orden visual actual. Con varios archivos, primero se unen en memoria y después se extraen los tramos. La descarga de más de una parte es un ZIP sin compresión (`src/zip.ts`).

Hacen falta al menos dos archivos para preparar la unión. Preparar en Ordenar arma un PDF del orden visible. Mezclar hojas ya deja ese PDF listo para descargar, sin un segundo preparado.

El historial guarda hasta 100 acciones, más el paso de origen. Ctrl+Z deshace y Ctrl+Mayús+Z rehace. No hay Ctrl+Y. El historial es del documento, no de la herramienta abierta.

## Gestos que no hay que romper

- Clic reemplaza la selección. Ctrl o Cmd y clic alterna. Mayús y clic marca el tramo.
- Arrastrar una hoja marcada mueve todo el grupo y conserva el orden relativo. Soltar sobre la hoja tomada no hace nada.
- Durante un arrastre múltiple, las otras hojas marcadas siguen ocupando su sitio (`visibility`, no `display: none`). Si se ocultan del flujo, el hueco se abre en el lugar equivocado.
- El recuadro de selección solo nace en la columna central (`main#trabajo`). Por debajo de 4 px es un clic y limpia la selección, salvo con Ctrl o Mayús. Escape durante el gesto vuelve a la selección inicial.
- Ctrl y la rueda solo cambian el tamaño de las hojas cuando el puntero está sobre esa columna.
- Los botones de acción son solo icono. El nombre va en el tooltip. Un botón inactivo usa `aria-disabled`, no el atributo `disabled`, para que el tooltip siga apareciendo.
- Importar desde Ordenar o Dividir sustituye el documento. Importar desde Unir agrega PDF.

## Mapa corto

| Ruta | Para qué |
| --- | --- |
| `src/App.tsx` | Pantalla, atajos, preparar y descargar |
| `src/document.ts` | Estado, historial, deshacer |
| `src/merge.ts` | Bloques de archivo y cuándo siguen separados |
| `src/pdf/merge.ts` | Copiar páginas al PDF de salida |
| `src/pdf/reorder.ts` | Leer, reordenar y extraer de un solo PDF |
| `src/split.ts` | Cortes, cada N y cada hoja |
| `src/components/PageGrid.tsx` | Hojas arrastrables |
| `src/components/FileDeck.tsx` | Archivos cerrados de Unir |
| `scripts/check.ts` | Pruebas del orden, la unión, el corte y el ZIP |

`scripts/check.ts` importa módulos con extensión `.ts` porque lo ejecuta Node. El resto del código lo resuelve Vite.

## Git

`.env` no se versiona. La plantilla es `.env.example`.

| Variable | Uso |
| --- | --- |
| `GITHUB_PAT` | Token personal. Solo lo leen los `.bat`. |
| `GITHUB_REPO` | URL HTTPS del repositorio, sin usuario ni token en la dirección. |
| `GITHUB_BRANCH` | Rama. Si falta, los scripts usan `main`. |

`gitpush.bat` pide un mensaje. Si escribes uno y hay cambios, hace el commit y envía `HEAD` a esa rama. Enter sin mensaje solo intenta el envío. `gitpull.bat` baja esa rama y solo avanza si puede hacerlo en línea recta.

El repositorio local todavía no tiene commits. La primera subida necesita un mensaje en `gitpush.bat`.
