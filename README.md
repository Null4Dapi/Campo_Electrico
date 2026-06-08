# Simulador de Campo Eléctrico 3D

Una herramienta educativa interactiva, open-source y de acceso web para visualizar y manipular campos eléctricos en un espacio tridimensional. Permite a estudiantes y docentes observar en tiempo real las líneas de campo y las superficies equipotenciales generadas por cargas eléctricas estáticas.

## Características Principales

- **Simulación en Tiempo Real:** Visualiza vectores de campo eléctrico interactuando de acuerdo a la Ley de Coulomb.
- **Superficies Equipotenciales 3D:** Cálculo volumétrico mediante el algoritmo de _Marching Cubes_.
- **Interactividad Total:** Drag & Drop de cargas positivas y negativas en un lienzo 3D.
- **Alto Rendimiento:** Procesamiento intensivo delegado a Web Workers para mantener 60 FPS en dispositivos estándar.

## Stack Tecnológico

- **Frontend:** React 18, TypeScript, Tailwind CSS v4
- **Motor Gráfico 3D:** Three.js + React Three Fiber + Drei
- **Estado Global:** Zustand
- **Build Tool:** Vite

## Ejecución Local

1. Clona el repositorio:

   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd Campo_Electrico
   ```

2. Configura las variables de entorno:
   Crea un archivo `.env` en la raíz del proyecto (basado en `.env.example` si existe) y añade tus credenciales:
   ```env
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

3. Instala las dependencias usando pnpm:

   ```bash
   pnpm install
   ```

4. Inicia el servidor de desarrollo:

   ```bash
   pnpm dev
   ```
