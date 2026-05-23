# FísicaViz 2D: Simulador Interactivo de Campo Eléctrico

FísicaViz 2D es un simulador científico interactivo diseñado para la enseñanza y resolución de problemas sobre **campo eléctrico y potencial eléctrico** en dos dimensiones ($XY$). Cuenta con un lienzo interactivo en 3D de alta performance restringido al plano de visualización horizontal, un resolvedor analítico paso a paso con la estética inmersiva de una **Pizarra de Cristal de Neón Oscura** y un extractor inteligente de problemas de física en lenguaje natural potenciado por la inteligencia artificial de **Google Gemini**.

---

## Características Principales

* **Lienzo Interactivo Fluido**: Mueve cargas eléctricas puntuales y el punto de prueba P libremente con el ratón sobre la cuadrícula del plano $XY$ (con la coordenada Z fija en $0$).
* **Pizarra de Cristal de Neón**: Un resolvedor analítico que calcula en tiempo real y detalla paso a paso las operaciones físicas utilizando vectores bidimensionales:
  * Distancias y vectores de posición relativa: $\vec{r}_i = (r_x, r_y)\text{ cm}$.
  * Magnitudes de distancia bajo Pitágoras: $|r_i| = \sqrt{r_x^2 + r_y^2}$.
  * Componentes vectoriales individuales del campo: $\vec{E}_i = (E_x, E_y)\text{ N/C}$.
  * Suma vectorial final (Principio de Superposición) y potencial eléctrico total $V$ en voltios.
* **Extractor de Problemas con IA (Gemini)**: Escribe enunciados de problemas de física en lenguaje natural (ej: *"Colocamos una carga de 2nC en el origen y otra de -3nC en (10, 0) cm. Calcula el campo en (5, 5) cm"*). La IA extraerá automáticamente el valor de las cargas, sus posiciones espaciales y el punto de prueba, configurando y resolviendo el escenario instantáneamente en 2D.
* **Mapeo de Líneas de Campo y Calor**: Herramientas integradas para encender o apagar las líneas de corriente eléctrica dinámicas (con partículas móviles) y mapas de calor cromáticos que representan la intensidad del potencial electrostático.
* **Ejercicios Teóricos (Presets)**: Configuraciones rápidas predefinidas como dipolos eléctricos, triángulos de cargas y configuraciones cuadrapolares.

---

## Arquitectura del Sistema

El simulador cuenta con una estructura **Full-Stack moderna** integrada localmente:

1. **Frontend (Vue 3 + TypeScript)**:
   * **Vite**: Servidor de desarrollo ultra-rápido y empaquetador.
   * **Three.js**: Renderizado 3D de alto rendimiento para el lienzo y vectores de fuerza.
   * **OrbitControls**: Manipulación libre de la cámara (zoom, rotación, paneo).
   * **Glassmorphism UI**: Interfaz translúcida elegante integrada de forma no obstructiva sobre la escena principal.

2. **Backend (Python 3 + FastAPI)**:
   * **FastAPI**: API REST asíncrona de alto rendimiento que sirve los endpoints de extracción de IA.
   * **Google Generative AI SDK**: Comunicación directa con los modelos Gemini para el procesamiento y estructuración JSON de enunciados complejos.
   * **Matplotlib**: Motor matemático interno para validaciones gráficas científicas.

---

## Requisitos de Instalación

Antes de iniciar la aplicación en tu máquina local, asegúrate de tener instalado:
* **Node.js** (versión 18 o superior)
* **Python** (versión 3.10 o superior)

---

## Configuración y Puesta en Marcha

### 1. Servidor Backend (FastAPI)

1. Abre una terminal y navega hasta el directorio del backend:
   ```bash
   cd backend
   ```

2. Crea un entorno virtual de Python para mantener aisladas las dependencias:
   ```bash
   python -m venv venv
   ```

3. Activa el entorno virtual:
   * **En Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **En macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

4. Instala las dependencias del archivo `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

5. Crea un archivo `.env` en la raíz de la carpeta `backend` e ingresa tu API Key de Google Gemini:
   ```env
   GEMINI_API_KEY=tu_clave_de_api_aqui
   ```
   *(Nota: Si no posees una variable de entorno configurada en el backend, la interfaz web del frontend te permitirá introducir una clave temporal en la pestaña de IA).*

6. Inicia el servidor backend en modo de recarga automática en el puerto `8000`:
   ```bash
   python -m uvicorn main:app --reload
   ```
   El servidor estará disponible en [http://localhost:8000](http://localhost:8000).

---

### 2. Cliente Frontend (Vue 3)

1. Abre otra terminal independiente en la carpeta raíz del proyecto (donde se encuentra `package.json`).

2. Instala todos los paquetes de Node.js necesarios:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo del frontend:
   ```bash
   npm run dev
   ```

4. Abre tu navegador e ingresa a la dirección mostrada en la terminal (por defecto [http://localhost:5173](http://localhost:5173)).

---

## ¿Cómo funciona el Flujo de Datos?

* **Interacción Espacial**: Al interactuar con el lienzo de Three.js (arrastrando cargas o haciendo doble clic para posicionar el Punto P), las coordenadas se actualizan en el almacén de estado global reactivo (`useStore.ts`) forzando la componente Z a ser `0`. 
* **Cálculo Físico Local**: El frontend recalcula la intensidad del campo y el potencial local mediante el componible de física analítica (`usePhysics.ts`). Estos resultados alimentan dinámicamente las etiquetas y la Pizarra de Cristal en `RightPanel.vue`.
* **Procesamiento de IA**: Al dictar un problema en la pestaña **🤖 IA**, el texto se envía a través de una solicitud HTTP `POST` a `/api/extract-problem` en el backend de Python. El backend consulta de manera segura a Gemini usando la API Key confidencial, estructurando la respuesta en un formato JSON estándar que describe las cargas y posiciones en 2D. El frontend recibe este JSON y configura instantáneamente todo el escenario de simulación.
* **Vite Proxy**: La configuración en `vite.config.ts` incluye un proxy de desarrollo que desvía automáticamente las solicitudes al endpoint local del backend de Python en el puerto `8000` sin causar problemas de origen cruzado (CORS).
