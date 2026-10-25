# Flujo general para preparar y publicar una aplicación en producción

Esta guía usa WTBOT como ejemplo, pero el modelo está pensado para reutilizarse en otras aplicaciones que se distribuyan mediante GitHub Releases, GitHub Actions y contenedores Docker.

## 1. Modelo general

El flujo separa cinco responsabilidades:

1. **Código fuente:** vive en el repositorio y se trabaja en la rama principal.
2. **Versión:** un archivo pequeño, `VERSION`, define la versión que se quiere publicar.
3. **Validación y construcción:** GitHub Actions prueba el código y construye artefactos reproducibles.
4. **Distribución:** una GitHub Release entrega el paquete operativo y un registro de contenedores entrega las imágenes.
5. **Actualización del cliente:** el cliente descarga primero los archivos operativos y aplica las imágenes sólo cuando se ejecuta el reinicio.

La idea central es que **el repositorio no se instala en los equipos cliente**. El cliente recibe únicamente:

- configuración local;
- un archivo Compose de producción;
- scripts operativos;
- referencias exactas a imágenes Docker ya compiladas.

## 2. Dos acciones distintas: subir código y publicar versión

No deben confundirse.

### Subir código a `main`

Publica commits en el repositorio, pero no crea una Release ni reemplaza las imágenes utilizadas por los clientes.

En WTBOT se usa:

```text
gitpush.bat
```

El script de subida debe limitarse a preparar el commit y publicar `main`. No debe crear tags ni iniciar accidentalmente el flujo de Release.

### Publicar una versión

Publica un tag inmutable con el formato `vMAJOR.MINOR.PATCH`. Ese tag activa GitHub Actions, que valida, compila y publica la versión.

En WTBOT se usa:

```text
PublicarVersion.bat
```

Por tanto, el orden correcto es:

```text
cambios locales
    -> pruebas locales
    -> VERSION y notas de versión
    -> commit
    -> push de main
    -> tag vX.Y.Z
    -> GitHub Actions
    -> Release estable
    -> Actualizar.bat en el cliente
    -> restart.bat en el cliente
```

## 3. `VERSION` como fuente de verdad

El archivo `VERSION` contiene exclusivamente una versión semántica:

```text
2.2.8
```

No debe incluir la letra `v`, espacios, comentarios ni texto adicional.

El formato es:

```text
MAJOR.MINOR.PATCH
```

- **MAJOR:** cambios incompatibles que obligan a migrar o adaptar instalaciones.
- **MINOR:** funcionalidades nuevas compatibles con la versión anterior.
- **PATCH:** correcciones, seguridad y ajustes compatibles.

Para una publicación, estas identidades deben coincidir:

```text
VERSION                 2.2.8
tag Git                 v2.2.8
imagen backend          :2.2.8
imagen gateway          :2.2.8
imagen frontend         :2.2.8
paquete operativo       wtbot-runtime-2.2.8.zip
notas dentro de la app  2.2.8
```

Si alguna no coincide, el proceso debe detenerse. Nunca se debe corregir esa incoherencia manualmente después de publicar.

## 4. Cómo preparar una nueva versión

### Paso 1: terminar y probar el cambio

Antes de cambiar la versión:

- probar el comportamiento real afectado;
- ejecutar pruebas automáticas;
- validar lint, tipos y compilación;
- validar `docker compose config --quiet`;
- levantar el Compose local y comprobar salud, migraciones y flujo principal;
- ejecutar `git diff --check`;
- revisar que no haya secretos ni archivos locales nuevos.

Una corrección no está lista sólo porque el código compile. Debe probarse en el límite donde ocurrió el problema: API, base de datos, volumen, navegador, red o contenedor, según corresponda.

### Paso 2: elegir la siguiente versión

Comparar el alcance con SemVer:

- reparación compatible: incrementar `PATCH`;
- funcionalidad compatible: incrementar `MINOR` y volver `PATCH` a cero;
- incompatibilidad deliberada: incrementar `MAJOR` y volver los demás componentes a cero.

Editar `VERSION` una sola vez y usar ese valor en todo el flujo. Las plantillas de producción no deberían contener versiones escritas manualmente en varios lugares; el generador debe renderizarlas desde `VERSION`.

### Paso 3: añadir las notas visibles en la aplicación

En WTBOT se editan en:

```text
frontend/src/features/information/release-notes.json
```

La entrada nueva se agrega al principio del arreglo. Ejemplo:

```json
{
  "version": "2.2.9",
  "date": "2026-10-24",
  "title": "Carga de archivos restaurada",
  "fixed": [
    "Las imágenes vuelven a cargarse correctamente en instalaciones con volúmenes existentes."
  ]
}
```

Campos usados:

- `version`: debe ser idéntica a `VERSION` y no lleva `v`.
- `date`: fecha de publicación en formato `AAAA-MM-DD`.
- `title`: nombre breve que explique el propósito de la versión.
- `added`: funciones nuevas visibles para el usuario.
- `changed`: cambios de comportamiento o mejoras.
- `fixed`: errores corregidos.

Sólo se incluyen las categorías que tengan contenido. Las notas deben explicar el resultado para el usuario, no commits, nombres internos de funciones ni detalles irrelevantes de implementación.

Estas notas forman parte de la compilación del frontend. No se obtienen automáticamente del texto de GitHub Release. Por eso deben estar terminadas **antes del commit, del tag y de la construcción de imágenes**.

### Paso 4: revisar los artefactos de producción

Debe existir una separación entre desarrollo y producción:

- el Compose de desarrollo puede contener `build`, pruebas y herramientas locales;
- el Compose del cliente usa imágenes exactas y no compila;
- los Dockerfiles producen etapas finales mínimas;
- el paquete operativo usa una lista cerrada de archivos permitidos;
- `.env`, datos, respaldos y credenciales quedan fuera del paquete y del repositorio.

En WTBOT, `scripts/build_runtime_release.py`:

1. valida el formato de `VERSION`;
2. comprueba que el tag esperado sea exactamente `v` más `VERSION`;
3. rechaza archivos inesperados en `distribution/runtime/`;
4. reemplaza `__WTBOT_VERSION__` en el Compose de producción;
5. crea un ZIP determinista;
6. genera su checksum SHA-256.

## 5. Commit y subida a GitHub

Antes de publicar:

```text
git status
git diff --check
```

El commit debe contener juntos:

- la implementación;
- sus pruebas;
- `VERSION` actualizado;
- la entrada nueva de notas de versión;
- cualquier plantilla operativa necesaria para instalar o actualizar.

Después se publica `main` mediante el script de subida. Al terminar, se comprueba que:

- el árbol local esté limpio;
- se esté en `main`;
- `HEAD` coincida con `origin/main`;
- todavía no se haya creado el tag de la nueva versión.

Subir `main` es una preparación. Todavía no hay una nueva versión para clientes.

## 6. Publicación mediante tag

`PublicarVersion.bat` realiza las protecciones de publicación:

1. lee `VERSION`;
2. valida `MAJOR.MINOR.PATCH`;
3. exige la rama `main`;
4. exige un árbol limpio;
5. actualiza la referencia de `origin/main`;
6. exige que el commit local ya esté publicado;
7. comprueba tags locales y remotos;
8. crea el tag anotado `vX.Y.Z`;
9. publica únicamente ese tag.

El PAT de escritura se lee desde el `.env` local y nunca debe aparecer en comandos impresos, URLs, commits ni documentación versionada.

Los tags publicados deben tratarse como inmutables. Si una Release estable ya existe, se publica una versión PATCH nueva. El reemplazo de un tag sólo es razonable para recuperar una publicación incompleta que todavía no produjo una Release.

## 7. Qué debe hacer GitHub Actions

El workflow se activa únicamente al recibir un tag que cumpla:

```text
v*.*.*
```

### Validaciones independientes

- **Backend:** dependencias, migraciones, lint y pruebas con PostgreSQL real.
- **Gateway:** instalación reproducible, auditoría, pruebas, tipos y build.
- **Frontend:** instalación reproducible, auditoría, pruebas, lint, tipos y build.
- **Runtime Windows:** contratos de BAT y PowerShell.
- **Compose:** configuración, construcción, arranque, salud, migración vigente, servicios privados y puertos permitidos.

### Publicación condicionada

El job de Release sólo empieza si todas las validaciones anteriores pasan. Luego:

1. comprueba que el tag coincida con `VERSION`;
2. genera el ZIP operativo y su SHA-256;
3. inicia sesión en el registro con el token temporal de Actions;
4. construye y publica imágenes para la plataforma soportada;
5. crea una Release en estado borrador;
6. adjunta ZIP y checksum;
7. inspecciona que las imágenes sean mínimas y no ejecuten como `root`;
8. levanta una instalación limpia usando las imágenes ya publicadas;
9. prueba salud, frontend y migraciones;
10. sólo entonces convierte la Release en estable y la marca como la más reciente.

Una Action verde en una subida común no equivale necesariamente a una Release. La condición decisiva es que el workflow haya sido iniciado por el tag y que el job `release` haya terminado correctamente.

## 8. Qué recibe el cliente

La Release contiene un paquete operativo pequeño, no el repositorio completo. En WTBOT incluye:

- `.env.example`;
- `VERSION`;
- `compose.yaml`;
- `install.bat`;
- `Actualizar.bat`;
- `restart.bat`;
- `wtbot-runtime.ps1`;
- utilidades operativas permitidas;
- un checksum separado.

El equipo cliente no necesita recibir:

- `.git` ni historial;
- código fuente;
- tests;
- documentación interna;
- workflows;
- scripts de push, tags o publicación;
- herramientas de desarrollo.

## 9. Instalación inicial

El patrón recomendado usa dos archivos portátiles:

1. **Preparador del equipo:** habilita los componentes de Windows requeridos e instala Docker Desktop.
2. **Preinstalador:** consulta la última Release estable, descarga ZIP y checksum, verifica ambos y crea la carpeta de instalación.

El preinstalador habla con GitHub para descargar la Release. No necesita iniciar sesión en Docker. El acceso al registro de imágenes ocurre después, durante `install.bat` o `restart.bat`.

`install.bat` valida Docker, inicia sesión en el registro, descarga las imágenes y levanta la aplicación con el Compose de producción.

## 10. Actualización en el cliente

La actualización se divide deliberadamente en dos pasos.

### `Actualizar.bat`: descargar, validar y preparar

Este script:

1. consulta `/releases/latest`;
2. ignora borradores y prereleases;
3. compara la versión local con la estable más reciente;
4. descarga ZIP y checksum;
5. verifica SHA-256;
6. verifica la lista exacta de archivos permitidos;
7. comprueba que el `VERSION` interno coincida con la Release;
8. respalda los archivos operativos actuales;
9. los reemplaza transaccionalmente;
10. restaura el respaldo si el reemplazo falla.

Debe conservar:

- `.env` real;
- volúmenes Docker;
- base de datos;
- sesiones y archivos persistentes;
- contenedores actualmente activos.

`Actualizar.bat` **no reinicia** la aplicación. Esto permite preparar la actualización sin interrumpir el servicio.

### `restart.bat`: descargar imágenes y aplicar

Este script:

1. valida Docker y la configuración;
2. inicia sesión en el registro privado;
3. ejecuta `docker compose pull` para descargar todas las imágenes primero;
4. sólo si la descarga termina correctamente ejecuta `docker compose up -d --wait --remove-orphans`.

Si `pull` falla, los contenedores activos deben permanecer intactos. Si el arranque posterior falla, se muestran estado y logs para diagnóstico; no se debe intentar automáticamente un downgrade de base de datos.

### No confundir reinicio de cliente con reinicio de desarrollo

- El `restart.bat` de distribución descarga imágenes publicadas y puede necesitar autenticación del registro.
- El `restart.bat` del repositorio local compila las imágenes desde el código de desarrollo y reinicia el Compose local.

Son herramientas distintas y ninguna debe sobrescribir o asumir el comportamiento de la otra.

## 11. Verificación posterior a la Release

Antes de anunciar la actualización:

- confirmar que todos los jobs de Actions estén verdes;
- confirmar que la Release ya no sea borrador;
- comprobar que ZIP y checksum estén adjuntos;
- comprobar que las imágenes tengan exactamente la etiqueta de `VERSION`;
- ejecutar `Actualizar.bat` en un equipo de prueba;
- comprobar que todavía no hubo reinicio;
- ejecutar `restart.bat`;
- comprobar salud, migraciones y datos existentes;
- abrir la aplicación y verificar la versión mostrada;
- abrir “Notas de la versión” y verificar la entrada nueva;
- probar directamente la función principal modificada.

Sólo después se distribuye el aviso a clientes.

## 12. Fallos comunes y criterio de respuesta

### `VERSION`, tag y notas no coinciden

No publicar. Corregir, probar y crear un commit nuevo antes del tag.

### El tag existe, pero no hay Release

Primero revisar la ejecución de Actions. Sólo una publicación incompleta y sin Release estable admite recuperar o reemplazar el tag.

### La Release existe y tiene un defecto

No reemplazarla. Corregir el defecto e incrementar `PATCH`.

### Actions falla en pruebas o Compose

No publicar manualmente los artefactos faltantes. Reparar la causa, ejecutar nuevamente el flujo completo y conservar la evidencia de las validaciones.

### `Actualizar.bat` funciona, pero el cliente sigue en la versión anterior

Es el comportamiento esperado hasta ejecutar `restart.bat`: actualizar cambia archivos operativos; reiniciar aplica imágenes y servicios.

### Un cliente pierde configuración o datos

Eso indica que el actualizador trató archivos persistentes como artefactos reemplazables o eliminó volúmenes. `.env` y volúmenes nunca deben formar parte del reemplazo normal.

## 13. Cómo trasladar este modelo a otra aplicación

Para reutilizar el flujo, reemplazar los nombres específicos pero conservar los contratos:

| Concepto | Implementación reutilizable |
|---|---|
| Versión única | Archivo `VERSION` con SemVer |
| Historial visible | JSON, YAML o módulo incluido en la interfaz |
| Publicador | Script que valida rama, limpieza, remoto y tag |
| CI | Pruebas independientes por componente |
| Release | Job condicionado al éxito total |
| Artefacto cliente | Paquete mínimo con allowlist y checksum |
| Binarios o servicios | Imágenes con etiquetas exactas, sin depender de `latest` |
| Actualizador | Descarga y reemplazo transaccional sin reinicio |
| Aplicador | Descarga completa antes de recrear servicios |
| Configuración y datos | Persistentes y fuera del paquete reemplazable |

El principio más importante es mantener una cadena verificable:

```text
un commit exacto
    -> una versión exacta
    -> un tag exacto
    -> artefactos construidos automáticamente
    -> una Release validada
    -> una actualización verificable y reversible antes del reinicio
```

Si esa relación se conserva, es posible saber qué código ejecuta cada cliente, reproducir una versión, diagnosticar fallos y publicar correcciones sin entregar el entorno completo de desarrollo.
