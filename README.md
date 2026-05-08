npm init -y
npm install puppeteer
node download-ui.js

1. Se abre Chrome
2. Haces login (si aparece)
3. Navegas al menú/página que quieres (dashboard, offers, etc.)
4. Esperas que cargue TODO (muy importante)
5. Vuelves a la terminal
6. Presionas ENTER
7. El script guarda TODO lo que ya está cargado en esa pantalla


📌 Nota

El script descarga todos los recursos que el navegador carga mientras navegas (CSS, JS, imágenes, etc.).

👉 Sin embargo, solo guarda el HTML de la página en la que estás al momento de finalizar (ENTER).

El script también revisa las imágenes referenciadas en el HTML final y descarga las que falten. Esto ayuda cuando el sitio usa `loading="lazy"` y algunas imágenes todavía no fueron pedidas por el navegador mientras navegabas.


📌 Nota sobre chrome-profile

La carpeta chrome-profile es utilizada por Puppeteer para guardar la sesión del navegador, incluyendo cookies, login y almacenamiento local.

👉 Esto permite que, después de iniciar sesión una vez, el script pueda acceder directamente a la aplicación sin requerir login nuevamente.

⚠️ Consideraciones
✔ Puedes dejar la carpeta para reutilizar la sesión
✔ Puedes borrarla si quieres empezar desde cero
❗ Si la borras, tendrás que hacer login nuevamente en la próxima ejecución


📌 Nota sobre estilos y query string

Algunas URLs de recursos traen query string, por ejemplo:

```text
ClientPortalAssets/dsc/style.css?13
common.css?v=123
app.js?v=abc
```

Antes el script guardaba esos archivos usando el query string como parte del nombre, por ejemplo `style.css__13`.

Cuando se sirve el sitio localmente, el navegador puede pedir `style.css?13`, pero el servidor busca el archivo físico `style.css`. Si el archivo guardado se llama `style.css__13`, el CSS no se encuentra y la página se ve sin estilos completos.

Por eso los recursos deben guardarse sin el query string:

```text
style.css?13       -> style.css
common.css?v=123   -> common.css
app.js?v=abc       -> app.js
```

Después de esta corrección, borra la carpeta `site` y ejecuta el script otra vez para descargar los recursos con los nombres correctos.


📌 Cómo probar localmente

Versión explicada:

```bash
# Borra la carpeta site completa para evitar archivos viejos.
# rm significa "remove" y -rf significa:
# -r: borrar carpetas de forma recursiva, incluyendo todo su contenido
# -f: forzar el borrado sin pedir confirmación por cada archivo
rm -rf site

# Ejecuta el script otra vez.
# Se abrirá Chrome, podrás hacer login/navegar y luego presionar ENTER.
node download-ui.js

# Entra a la carpeta del sitio descargado.
cd site/downstreamcasinoresortportal.tpiwebservices.com

# Levanta un servidor local en esta carpeta.
# El punto "." significa "esta carpeta actual".
npx serve .
```

Versión rápida para copiar y pegar:

```bash
rm -rf site
node download-ui.js
cd site/downstreamcasinoresortportal.tpiwebservices.com
npx serve .
```

En PowerShell de Windows también puedes borrar la carpeta `site` con:

```powershell
Remove-Item -Recurse -Force site
```
