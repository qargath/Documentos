# Contexto para desarrollar Document♥s

Guía de quien mantiene el código. La guía de uso está en `README.md`, en la raíz, y no lleva detalles de implementación.

## Producto

Document♥s es un taller de PDF de uso local. El corazón del nombre sustituye a la o final de Documentos. La interfaz va en español neutro.

Los bytes del PDF no salen del navegador. No hay cuenta, ni servidor de archivos, ni telemetría. Docker solo sirve la aplicación ya construida.

El tema claro u oscuro vive en `localStorage` con la clave `documentos-tema`. Cambia los colores de la interfaz. Las hojas, sus miniaturas y el papel de los archivos usan `--color-sheet` y no siguen el tema.

Funciones listas: Ordenar páginas, Dividir, Unir, Extraer páginas, Numerar páginas. Aparecen en la barra y aún no hacen nada: Comprimir, Convertir, Proteger.

## Cómo correrla

Hace falta Docker. No instales Node en Windows para construir: el build corre dentro de la imagen.

```bash
docker compose up --build -d
```

En el repositorio, `restart.bat` hace eso mismo: compila el código local y reinicia el Compose de desarrollo. No descarga una imagen publicada.

Queda en http://localhost:4173. El proyecto de Compose se llama `documentos`, el servicio `web`, y publica `4173:8080`. Dentro del contenedor nginx escucha en 8080 y corre como el usuario `nginx`. `/salud` responde `ok`.

Tras un cambio de interfaz, vuelve a construir y recarga el navegador. `npm run build` dentro de la imagen ejecuta `tsc --noEmit` y Vite. Antes pasa `node --experimental-strip-types scripts/check.ts`.

En PowerShell no uses `&&`. Encadena con `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`.

`.dockerignore` excluye `*.md`, así que el README no entra en la imagen.

## Stack

React 19, TypeScript, Vite 8 y Tailwind 4. Las miniaturas salen de pdf.js. Las páginas se copian con pdf-lib 1.17.1. El arrastre usa `@dnd-kit`. El productor de los PDF generados es `Document♥s`.

pdf-lib 1.17.1 no cifra ni descifra. Un PDF con contraseña se rechaza con un mensaje en español.

## Un solo documento

Ordenar, Unir, Dividir y Extraer leen el mismo estado (`src/document.ts`). Extraer no escribe el documento: arma un PDF aparte con las páginas marcadas. No son archivos distintos ni un pipeline de pasos obligatorios.

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
- El recuadro de selección solo nace en la columna central (`main#trabajo`), en Ordenar páginas y en Extraer páginas. Por debajo de 4 px es un clic y limpia la selección, salvo con Ctrl o Mayús. Escape durante el gesto vuelve a la selección inicial.
- Extraer usa la misma grilla, sin arrastre ni botones de lugar. `selectedInOrder` en `src/extract.ts` conserva el orden visual, no el orden de los clics. Preparar no toca el documento. La descarga se llama `nombre-extraido.pdf`.
- Numerar tampoco modifica el documento. Automático pide posición, página de inicio y número inicial, y numera todas las páginas desde ahí con Arial 12. Asistido puede ocultar el número en algunas páginas sin saltarse la cuenta, luego elige entre Arial, Times New Roman, Garamond y Georgia, acomoda el número y muestra la previa. La copia se llama `nombre-numerado.pdf`. El borde interno y el externo se alternan: en la página impar el externo queda a la derecha.
- En Dividir, el centro tiene los atajos de partir y el riel. Una cuchilla parte el archivo en ese punto y se puede arrastrar. Cada tramo es un mazo con la primera y la última página; si no caben, se achican, pasan a dos filas y, con muchos tramos, a una ficha de inicio y fin (`src/components/SplitStage.tsx`). Escape quita todos los cortes.
- Ctrl y la rueda solo cambian el tamaño de las hojas cuando el puntero está sobre esa columna.
- Los botones de acción son solo icono. El nombre va en el tooltip. Un botón inactivo usa `aria-disabled`, no el atributo `disabled`, para que el tooltip siga apareciendo.
- Importar desde Ordenar, Dividir o Extraer sustituye el documento. Importar desde Unir agrega PDF.
- El pie de la barra tiene la versión y el tema. La versión abre las notas en la ventana principal, con todas las publicaciones. Escape vuelve a la herramienta.

## Mapa corto

| Ruta | Para qué |
| --- | --- |
| `src/App.tsx` | Pantalla, atajos, preparar y descargar |
| `src/document.ts` | Estado, historial, deshacer |
| `src/merge.ts` | Bloques de archivo y cuándo siguen separados |
| `src/pdf/merge.ts` | Copiar páginas al PDF de salida |
| `src/pdf/reorder.ts` | Leer, reordenar y extraer de un solo PDF |
| `src/split.ts` | Cortes del orden visible. Cada N y cada hoja siguen en el módulo, la pantalla usa la línea |
| `src/components/PageGrid.tsx` | Hojas arrastrables |
| `src/components/FileDeck.tsx` | Archivos cerrados de Unir |
| `scripts/check.ts` | Pruebas del orden, la unión, el corte y el ZIP |

`scripts/check.ts` importa módulos con extensión `.ts` porque lo ejecuta Node. El resto del código lo resuelve Vite.

## Git y publicación

El modelo está en `docs/FLUJO_PRODUCCION_LOCAL.md`. Aquí solo están los nombres de este proyecto.

Subir código y publicar una versión son dos pasos distintos.

| Archivo | Qué hace |
| --- | --- |
| `gitpush.bat` | Commit, si escribes mensaje, y envío de `HEAD` a `main`. No crea etiquetas. |
| `gitpull.bat` | Baja `main` solo si puede avanzar en línea recta. |
| `PublicarVersion.bat` | Exige `main` limpia, ya publicada, y envía únicamente el tag `v` + `VERSION`. |
| `VERSION` | Única versión, `MAJOR.MINOR.PATCH`, sin `v`. |
| `src/release-notes.json` | Notas que la interfaz muestra. La primera entrada tiene que ser esa versión. |

`.env` no se versiona. La plantilla de desarrollo es `.env.example`.

| Variable | Uso |
| --- | --- |
| `GITHUB_PAT` | Token personal. Solo lo leen los `.bat` de este repositorio. |
| `GITHUB_REPO` | URL HTTPS del repositorio, sin usuario ni token en la dirección. |
| `GITHUB_BRANCH` | Rama. Si falta, los scripts de subida usan `main`. |

El equipo donde se usa la aplicación no recibe este repositorio. Recibe el ZIP de la Release: Compose con la imagen `ghcr.io/qargath/documentos:<versión>`, los scripts operativos y un checksum. `distribution/runtime/` es la lista cerrada de ese paquete. `scripts/build_runtime_release.py` sustituye `__DOCUMENTOS_VERSION__`, arma el ZIP y calcula el SHA-256. `python scripts/check_release.py` revisa esos contratos; acepta `--dry-run` en el generador cuando todavía no existe el tag.

`distribution/preparar-equipo.bat` deja Docker listo. `distribution/preinstalar.bat` descarga la última Release estable y crea la carpeta. Allí, `install.bat` baja la imagen y arranca. `Actualizar.bat` reemplaza los archivos operativos y no reinicia. `restart.bat` de esa carpeta descarga las imágenes y, solo si eso termina, recrea los servicios. El `.env` real y los volúmenes no se reemplazan. El `.env` del cliente no es el de desarrollo: pide `GITHUB_TOKEN` y, si la imagen es privada, `GHCR_USERNAME` y `GHCR_TOKEN`.
