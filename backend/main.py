import base64
import io
import math
import os
import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
import matplotlib
import matplotlib.pyplot as plt
import numpy as np

# Cargar variables de entorno desde un archivo .env local
load_dotenv()

# Configurar Matplotlib para trabajar en entornos sin interfaz gráfica (headless)
matplotlib.use("Agg")

app = FastAPI(
    title="FísicaViz 3D Backend",
    description="Servidor de cálculo y graficación científica para simulador de campo eléctrico",
    version="1.0.0",
)

# Configurar CORS por seguridad
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constantes físicas
K_E = 8.99e9  # N·m²/C²


# Modelos de datos Pydantic
class Charge(BaseModel):
    q_nC: float
    x: float
    y: float
    z: float


class SolvePoint(BaseModel):
    x: float
    y: float
    z: float


class PlotRequest(BaseModel):
    charges: List[Charge]
    solvePoint: Optional[SolvePoint] = None
    plane: str = "xy"  # "xy" | "xz" | "yz"


class ExtractRequest(BaseModel):
    problemText: str
    apiKey: Optional[str] = None


@app.get("/")
def read_root():
    return {"status": "ok", "message": "FísicaViz 3D Python Backend activo y listo"}


@app.get("/api/config")
def get_config():
    """Expone si la API Key de Gemini está configurada de forma segura en las variables de entorno del backend"""
    return {"hasGeminiKey": bool(os.getenv("GEMINI_API_KEY"))}


@app.post("/api/extract-problem")
async def extract_problem(request: ExtractRequest):
    """Llama a la API de Gemini desde el Backend para analizar y extraer variables físicas de un enunciado"""
    # Prioridad: 1. API Key provista en el frontend, 2. Variable de entorno del backend
    api_key = request.apiKey or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="No se proporcionó una clave de API de Gemini. Configúrala en el backend (.env) o ingrésala en la interfaz."
        )

    # Configurar el SDK de Google Generative AI
    genai.configure(api_key=api_key)

    # Modelos de Gemini a evaluar en cascada (fallback)
    models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    error_raised = None
    response_text = ""

    # Prompt optimizado para variables simbólicas y paramétricas
    prompt = f"""
Analiza el siguiente problema de física sobre campo eléctrico y extrae todas las cargas puntuales y el punto de prueba P (si se menciona).

Problema:
"{request.problemText}"

REGLAS DE TRATAMIENTO DE VARIABLES SIMBÓLICAS/ALGEBRAICAS:
Si el enunciado es paramétrico o teórico y no provee valores numéricos concretos para variables (como "q", "Q", "a", "d", "L", "x"), debes asignarles valores numéricos por defecto lógicos y proporcionales para poder simularlos gráficamente en 3D:
- Si se mencionan cargas de valor genérico "q" o "Q", asígnales el valor por defecto de +1 nC (y -1 nC si se especifica que es una carga negativa, ej: "-q", "-Q").
- Si se mencionan distancias genéricas, constantes o parámetros de posición como "a", "d", "L" o similares, asígnales el valor de 0.1 metros (10 cm). Por ejemplo: si una carga está en (0, a), su coordenada Y será 0.1 metros. Si otra carga está en (0, -a), su coordenada Y será -0.1 metros.
- Si se pide calcular el campo o potencial en una coordenada genérica "x" sin especificar valor numérico, asume x = 0.15 metros (15 cm).

Debes extraer y convertir todas las variables exactamente de la siguiente manera:
1. "charges": Una lista de las cargas encontradas. Para cada carga debes obtener:
   - "q_nC": La magnitud de la carga en nanoCoulombs (nC). Si está en microCoulombs (uC) multiplícala por 1000. Si está en Coulombs (C) multiplícala por 1e9. Mantén el signo correcto (+ o -).
   - "x": Coordenada X convertida obligatoriamente a METROS. Si el problema lo da en centímetros (cm), divídelo entre 100. Si lo da en milímetros (mm), divídelo entre 1000.
   - "y": Coordenada Y convertida obligatoriamente a METROS.
   - "z": Coordenada Z convertida obligatoriamente a METROS. Si no se especifica Z, asume 0.
2. "solvePoint": El punto de prueba P donde se pide calcular el campo eléctrico o potencial. Si no se especifica ninguno en el enunciado, no lo incluyas (o pon null). Si se especifica, extrae:
   - "x": Coordenada X del punto P convertida a METROS.
   - "y": Coordenada Y del punto P convertida a METROS.
   - "z": Coordenada Z del punto P convertida a METROS.

Devuelve la respuesta en formato JSON puro respetando el siguiente esquema:
{{
  "charges": [
    {{ "q_nC": number, "x": number, "y": number, "z": number }}
  ],
  "solvePoint": {{ "x": number, "y": number, "z": number }} | null
}}
"""

    for model_name in models:
        try:
            model = genai.GenerativeModel(
                model_name,
                generation_config={"response_mime_type": "application/json"}
            )
            response = model.generate_content(prompt)
            if response.text:
                response_text = response.text
                break
        except Exception as e:
            error_raised = e
            print(f"Fallo con el modelo de Gemini '{model_name}': {str(e)}")

    if not response_text:
        raise HTTPException(
            status_code=500,
            detail=f"Fallo en la llamada a Gemini: {str(error_raised) if error_raised else 'Respuesta vacía'}"
        )

    # Limpiar posibles wrappers Markdown si existen
    clean_json = response_text.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(clean_json)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al analizar el formato JSON devuelto por Gemini: {str(e)}. Respuesta cruda: {response_text}"
        )


def detect_symmetric_dipole_case(charges: List[Charge]):
    """Detecta si el sistema corresponde a dos cargas idénticas sobre el eje Y

    posicionadas de forma simétrica (0, a) y (0, -a) con respecto al origen.
    """
    if len(charges) != 2:
        return None

    c1, c2 = charges[0], charges[1]

    # Validar que tengan la misma carga en magnitud y signo
    if abs(c1.q_nC - c2.q_nC) > 1e-5:
        return None

    # Validar que estén sobre el eje Y (x=0, z=0)
    if (
        abs(c1.x) > 1e-4
        or abs(c1.z) > 1e-4
        or abs(c2.x) > 1e-4
        or abs(c2.z) > 1e-4
    ):
        return None

    # Validar simetría en Y: y1 = -y2
    if abs(c1.y + c2.y) > 1e-4:
        return None

    a = abs(c1.y)
    if a < 1e-4:
        return None

    return {"q_nC": c1.q_nC, "a": a}


@app.post("/api/plot-field")
async def plot_field(request: PlotRequest):
    charges = request.charges
    solvePoint = request.solvePoint
    plane = request.plane.lower()

    if not charges:
        raise HTTPException(
            status_code=400, detail="Debe haber al menos una carga en el sistema"
        )

    # Identificar caso simétrico del ejercicio
    sym_case = detect_symmetric_dipole_case(charges)

    # Configurar la figura de Matplotlib: doble panel si es el caso simétrico, panel simple si no
    if sym_case:
        fig, (ax1, ax2) = plt.subplots(
            1, 2, figsize=(13, 5.5), gridspec_kw={"width_ratios": [1, 1.1]}
        )
    else:
        fig, ax1 = plt.subplots(1, 1, figsize=(7.5, 6))
        ax2 = None

    # Estilos generales oscuros/premium para coincidir con la UI
    plt.style.use("dark_background")
    fig.patch.set_facecolor("#0f172a")  # slate-900

    # 1. RENDERIZADO DEL MAPA 2D (Panel Izquierdo - ax1)
    ax1.set_facecolor("#1e293b")  # slate-800
    ax1.spines["bottom"].set_color("#475569")
    ax1.spines["top"].set_color("#475569")
    ax1.spines["left"].set_color("#475569")
    ax1.spines["right"].set_color("#475569")
    ax1.tick_params(colors="#94a3b8", labelsize=9)

    # Determinar qué coordenadas graficar según el plano elegido
    # Mapeo: horizontal, vertical, profundidad fija
    if plane == "xz":
        get_coords = lambda c: (c.x, c.z)
        coord_labels = ("X (m)", "Z (m)")
    elif plane == "yz":
        get_coords = lambda c: (c.y, c.z)
        coord_labels = ("Y (m)", "Z (m)")
    else:  # xy por defecto
        get_coords = lambda c: (c.x, c.y)
        coord_labels = ("X (m)", "Y (m)")

    # Definir límites de la visualización basados en las posiciones de las cargas
    coords_2d = [get_coords(c) for c in charges]
    xs = [pt[0] for pt in coords_2d]
    ys = [pt[1] for pt in coords_2d]

    if solvePoint:
        if plane == "xz":
            xs.append(solvePoint.x)
            ys.append(solvePoint.z)
        elif plane == "yz":
            xs.append(solvePoint.y)
            ys.append(solvePoint.z)
        else:
            xs.append(solvePoint.x)
            ys.append(solvePoint.y)

    margin = 0.15
    min_x, max_x = min(xs) - margin, max(xs) + margin
    min_y, max_y = min(ys) - margin, max(ys) + margin

    # Asegurar un rango mínimo para evitar grids degenerados
    if abs(max_x - min_x) < 0.1:
        min_x, max_x = -0.2, 0.2
    if abs(max_y - min_y) < 0.1:
        min_y, max_y = -0.2, 0.2

    # Mantener relación de aspecto cuadrada para no distorsionar vectores físicos
    max_range = max(max_x - min_x, max_y - min_y)
    mid_x = (min_x + max_x) / 2
    mid_y = (min_y + max_y) / 2
    min_x, max_x = mid_x - max_range / 2, mid_x + max_range / 2
    min_y, max_y = mid_y - max_range / 2, mid_y + max_range / 2

    # Crear Grid para evaluar el campo
    grid_res = 120
    X_grid = np.linspace(min_x, max_x, grid_res)
    Y_grid = np.linspace(min_y, max_y, grid_res)
    X, Y = np.meshgrid(X_grid, Y_grid)

    # Inicializar matrices de campo y potencial
    Ex = np.zeros_like(X)
    Ey = np.zeros_like(Y)
    V = np.zeros_like(X)

    # Calcular la superposición de campos en el grid
    for c in charges:
        q = c.q_nC * 1e-9
        cx, cy = get_coords(c)

        dx = X - cx
        dy = Y - cy
        r2 = dx**2 + dy**2

        # Evitar singularidades en la posición exacta de las cargas
        r2_safe = np.where(r2 < 1e-6, 1e-6, r2)
        r = np.sqrt(r2_safe)

        # Potencial eléctrico V = k*q/r
        V += K_E * q / r

        # Campo eléctrico E = k*q/r² * r_hat
        E_scalar = K_E * q / r2_safe
        Ex += E_scalar * (dx / r)
        Ey += E_scalar * (dy / r)

    # Graficar mapa de calor de Potencial (V)
    # Acotar potencial para evitar que los valores infinitos arruinen la escala
    v_max = np.percentile(np.abs(V), 93)
    v_min = -v_max if np.any(V < 0) else 0
    v_levels = np.linspace(v_min, v_max, 50)

    # Usar paleta de colores premium (Blue/Red para dipolos o Plasma para positivas)
    cmap = "RdBu_r" if np.any(V < 0) else "inferno"
    cf = ax1.contourf(X, Y, V, levels=v_levels, cmap=cmap, extend="both", alpha=0.6)

    # Añadir barra de colores compacta
    cbar = fig.colorbar(
        cf, ax=ax1, orientation="horizontal", pad=0.1, shrink=0.75
    )
    cbar.set_label("Potencial Eléctrico V (Volts)", color="#94a3b8", fontsize=8)
    cbar.ax.tick_params(colors="#94a3b8", labelsize=8)

    # Dibujar líneas de corriente del campo eléctrico (Streamlines)
    E_mag = np.sqrt(Ex**2 + Ey**2)
    # Streamplot funciona mejor si las velocidades no varían en órdenes de magnitud locos
    lw = 1.0 + 1.5 * (E_mag / np.max(E_mag)) ** 0.15
    ax1.streamplot(
        X,
        Y,
        Ex,
        Ey,
        color="#ffffff",
        linewidth=lw,
        density=1.0,
        arrowstyle="->",
        arrowsize=1.0,
        minlength=0.1,
    )

    # Dibujar las cargas como círculos brillantes
    for c in charges:
        cx, cy = get_coords(c)
        color = "#ef4444" if c.q_nC >= 0 else "#3b82f6"
        sign = "+" if c.q_nC >= 0 else "−"
        # Círculo
        ax1.plot(
            cx,
            cy,
            marker="o",
            markersize=13,
            color=color,
            markeredgecolor="#ffffff",
            markeredgewidth=1.5,
        )
        # Etiqueta de texto de signo
        ax1.text(
            cx,
            cy,
            sign,
            color="#ffffff",
            fontsize=10,
            weight="bold",
            ha="center",
            va="center",
        )

    # Dibujar el punto de prueba P si existe
    if solvePoint:
        px, py = (
            (solvePoint.x, solvePoint.z)
            if plane == "xz"
            else (solvePoint.y, solvePoint.z)
            if plane == "yz"
            else (solvePoint.x, solvePoint.y)
        )
        ax1.plot(
            px,
            py,
            marker="*",
            markersize=14,
            color="#eab308",
            markeredgecolor="#ffffff",
            markeredgewidth=1.0,
            label="Punto P",
        )
        ax1.legend(loc="upper right", facecolor="#0f172a", edgecolor="#475569")

    ax1.set_xlabel(coord_labels[0], color="#94a3b8", fontsize=10)
    ax1.set_ylabel(coord_labels[1], color="#94a3b8", fontsize=10)
    ax1.set_title(
        f"Líneas de Campo y Potencial ({plane.upper()})",
        color="#38bdf8",
        fontsize=11,
        weight="bold",
        pad=10,
    )
    ax1.grid(True, linestyle="--", alpha=0.15)

    # 2. RENDERIZADO DEL ANÁLISIS DE CURVAS DE APROXIMACIÓN (Panel Derecho - ax2)
    if sym_case and ax2:
        q_nC = sym_case["q_nC"]
        a = sym_case["a"]
        q_C = q_nC * 1e-9

        ax2.set_facecolor("#1e293b")
        ax2.spines["bottom"].set_color("#475569")
        ax2.spines["top"].set_color("#475569")
        ax2.spines["left"].set_color("#475569")
        ax2.spines["right"].set_color("#475569")
        ax2.tick_params(colors="#94a3b8", labelsize=9)

        # Generar puntos en el eje X para evaluar
        # Rango de evaluación: desde cerca de cero hasta una distancia lejana (5 * a)
        x_vals = np.linspace(0.001, 5.0 * a, 300)

        # 1. Curva Exacta
        E_exact = (2.0 * K_E * q_C * x_vals) / ((x_vals**2 + a**2) ** 1.5)

        # 2. Curva Cerca del origen (x << a) - Lineal
        E_near = (2.0 * K_E * q_C * x_vals) / (a**3)

        # 3. Curva Lejos del origen (x >> a) - Carga puntual 2q
        E_far = (2.0 * K_E * q_C) / (x_vals**2)

        # Graficar curvas
        ax2.plot(
            x_vals * 100,
            E_exact,
            label="Exacto (Ecuación General)",
            color="#10b981",
            linewidth=2.5,
        )
        ax2.plot(
            x_vals * 100,
            E_near,
            label="Aprox. Cerca: $E \\approx \\frac{2Kqx}{a^3}$ ($x \\ll a$)",
            color="#ef4444",
            linestyle="--",
            linewidth=1.8,
        )
        ax2.plot(
            x_vals * 100,
            E_far,
            label="Aprox. Lejos: $E \\approx \\frac{2Kq}{x^2}$ ($x \\gg a$)",
            color="#3b82f6",
            linestyle="-.",
            linewidth=1.8,
        )

        # Dibujar marcador para la ubicación del punto P actual si coincide con el eje x
        if solvePoint and abs(solvePoint.y) < 1e-4 and abs(solvePoint.z) < 1e-4:
            px_val = solvePoint.x
            if 0 < px_val <= 5.0 * a:
                # Calcular el campo exacto en la posición de P
                E_P = (2.0 * K_E * q_C * px_val) / ((px_val**2 + a**2) ** 1.5)
                ax2.plot(
                    px_val * 100,
                    E_P,
                    marker="*",
                    markersize=12,
                    color="#eab308",
                    label=f"Punto P en x={px_val*100:.1f} cm",
                    zorder=5,
                )

        # Acotar la visualización del eje Y para evitar que las asíntotas infinitas arruinen la gráfica
        y_limit = np.max(E_exact) * 1.5
        ax2.set_ylim(0, y_limit)
        ax2.set_xlim(0, 5.0 * a * 100)

        ax2.set_xlabel("Distancia $x$ en el eje horizontal (cm)", color="#94a3b8", fontsize=10)
        ax2.set_ylabel("Magnitud del Campo $E_x$ (N/C)", color="#94a3b8", fontsize=10)
        ax2.set_title(
            "Análisis de Aproximaciones Teóricas",
            color="#a855f7",
            fontsize=11,
            weight="bold",
            pad=10,
        )
        ax2.grid(True, linestyle="--", alpha=0.15)
        ax2.legend(
            loc="upper right",
            facecolor="#0f172a",
            edgecolor="#475569",
            fontsize=8.5,
        )

    plt.tight_layout()

    # Guardar el gráfico en un buffer en memoria
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=130, facecolor=fig.get_facecolor(), bbox_inches="tight")
    buf.seek(0)
    plt.close(fig)

    # Codificar a base64
    img_b64 = base64.b64encode(buf.read()).decode("utf-8")

    return {
        "status": "success",
        "plot_base64": f"data:image/png;base64,{img_b64}",
        "detected_symmetry": sym_case is not None,
        "symmetry_details": sym_case,
    }
