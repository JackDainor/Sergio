# SY CROP — aplicación web

Aplicación en español para registrar proveedores y cortes de confección, calcular prendas y dinero generado en reales brasileños (BRL), consultar el resumen por mes y **compartir** un PDF A4 separado por proveedor (con QR de pago Pix (elige cuenta Irma o Sergio)).

## Funciones
- Proveedores: crear, renombrar y eliminar.
- Cortes: proveedor, fecha, modelo, cantidad de prendas, precio unitario y foto opcional.
- Cálculo automático: cantidad × precio por prenda.
- Resumen mensual: cantidad de cortes, prendas y total generado.
- Informes PDF separados por proveedor para el mes elegido, con **QR de Pix** para pago fácil.
- **Compartir PDF** directo a WhatsApp, Messenger u otras apps (Web Share API en móviles).
- **Instalar como aplicación** (PWA) desde el botón “Instalar”.
- Tema claro/oscuro.
- Datos guardados localmente en el navegador.
- Diseño adaptable a móviles y escritorio; service worker para instalación/caché.

## Cómo usar
1. Extrae el ZIP o clona el repositorio.
2. Publica los archivos en Vercel / GitHub Pages (o abre `index.html` localmente).
3. Entra en **Proveedores** y registra cada proveedor.
4. En **Cortes**, registra una bolsa por cada modelo/entrega.
5. Selecciona el mes y entra en **Informes PDF** → **Compartir PDF** para enviar el informe (con QR de pago) por WhatsApp u otra app.

## Importante sobre los datos
Esta versión no usa servidor ni base de datos online. Los datos viven en `localStorage` del navegador y dispositivo actual. No se sincronizan automáticamente con otros dispositivos y pueden perderse al borrar los datos del navegador.

## PDF
El generador usa jsPDF desde CDN. El informe incluye:
- Cabecera con proveedor y mes
- Lista de cortes con foto, prendas, precio y total
- Totales del mes
- **QR de pago Pix** en la esquina inferior derecha

## Publicar en Vercel
1. Sube todos los archivos a un repositorio de GitHub.
2. En Vercel → Import Project → selecciona el repo.
3. Framework Preset: Other / Static. Sin build command. Output: `.`
4. Deploy.

## Estructura
- `index.html` — interfaz
- `styles.css` — estilos
- `app.js` — lógica, almacenamiento y PDF
- `manifest.json` — metadatos PWA + iconos
- `sw.js` — caché / instalación
- `logo.png`, `icon-*.png`, `favicon.png` — branding SY CROP
- `qr-irma.png + qr-sergio.png` — QR de pago incluido en los PDF
