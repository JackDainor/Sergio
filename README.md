# Taller Costura — aplicación web

Aplicación en español para registrar proveedores y cortes de confección, calcular prendas y dinero generado en reales brasileños (BRL), consultar el resumen por mes y exportar un PDF A4 separado por proveedor.

## Funciones
- Proveedores: crear, renombrar y eliminar.
- Cortes: proveedor, fecha, modelo, cantidad de prendas, precio unitario y foto opcional.
- Cálculo automático: cantidad × precio por prenda.
- Resumen mensual: cantidad de cortes, prendas y total generado.
- Informes PDF separados por proveedor para el mes elegido.
- Tema claro/oscuro.
- Datos guardados localmente en el navegador.
- Diseño adaptable a móviles y escritorio; service worker básico para instalación/caché.

## Cómo usar
1. Extrae el ZIP.
2. Abre `index.html` en el navegador o publica los archivos en GitHub Pages / Vercel.
3. Entra en **Proveedores** y registra cada proveedor.
4. En **Cortes**, registra una bolsa por cada modelo/entrega.
5. Selecciona el mes y entra en **Informes PDF** para descargar el informe individual de cada proveedor.

## Importante sobre los datos
Esta versión no usa servidor ni base de datos online. Los datos viven en `localStorage` del navegador y dispositivo actual. No se sincronizan automáticamente con otros dispositivos y pueden perderse al borrar los datos del navegador. Usa la función de exportación del navegador para hacer una copia de seguridad si vas a conservar registros importantes. No compartas el mismo perfil del navegador con otras personas si los datos deben ser privados.

## PDF
El generador usa jsPDF desde CDN, por lo que necesita conexión a internet para cargar la biblioteca en la primera visita. El diseño está preparado para una hoja A4. Si se registran muchísimos cortes en el mismo mes, el espacio puede ser insuficiente; revisa el PDF antes de usarlo como informe final.

## Publicar
### GitHub Pages
Sube todos los archivos del ZIP a la raíz de un repositorio y habilita Pages desde la rama principal y la carpeta raíz.

### Vercel
Importa el repositorio o sube el proyecto como sitio estático. No necesita comandos de build ni variables de entorno.

## Estructura
- `index.html` — interfaz
- `styles.css` — estilos adaptable móvil/escritorio
- `app.js` — lógica, almacenamiento y PDF
- `manifest.json` — metadatos PWA
- `sw.js` — caché básica
