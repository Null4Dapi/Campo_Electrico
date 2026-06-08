# Fórmulas Aplicadas

## 1. Constante de Coulomb

- `ke = 8.98755e9` (N·m²/C²)

## 2. Conversión de carga

- `q = charge.value * 1e-9`
- Convierte carga de nanocoulombs (nC) a coulombs (C).

## 3. Cálculo del campo eléctrico por superposición

Para un punto `P` y una carga puntual `q` en `r_q`:

- `dx = Px - qx`
- `dy = Py - qy`
- `dz = Pz - qz`
- `r^2 = dx*dx + dy*dy + dz*dz + ε`  
  - Donde `ε = 1e-10` es un factor de suavizado para evitar singularidades.
- `r^3 = (r^2)^(3/2)`
- `factor = (ke * q) / r^3`

Componentes del campo eléctrico total:

- `Ex += factor * dx`
- `Ey += factor * dy`
- `Ez += factor * dz`

Magnitud y dirección:

- `magnitude = sqrt(Ex*Ex + Ey*Ey + Ez*Ez)`
- `direction = [Ex/magnitude, Ey/magnitude, Ez/magnitude]`

Esto implementa la forma vectorial de la ley de Coulomb:

- `E = k q / r^2` con la dirección definida por el vector `r` entre la carga y el punto.

## 4. Cálculo del potencial eléctrico por superposición

Para un punto `P` y una carga puntual `q` en `r_q`:

- `r = sqrt(dx*dx + dy*dy + dz*dz + ε)`
- `V += (ke * q) / r`

Esto corresponde a la expresión:

- `V = k q / r`

## 5. Uso en el proyecto

Las fórmulas anteriores se usan en dos capas principales de la aplicación: el cálculo físico y el renderizado/visualización.

### 5.1. Capa física

- `src/physics/calculus.ts`
  - `calculateElectricField(point, charges)`:
    - Itera sobre todas las cargas definidas en el sistema.
    - Convierte el valor de la carga de nC a C.
    - Calcula el vector de desplazamiento `dx`, `dy`, `dz` entre el punto de interés y cada carga.
    - Aplica la ley de Coulomb en forma vectorial con suavizado `SOFTENING`.
    - Suma las contribuciones de cada carga para obtener el campo total.
    - Devuelve la dirección normalizada del campo y la magnitud en N/C.
  - `calculateElectricPotential(point, charges)`:
    - Usa la misma superposición de cargas para calcular el potencial total.
    - Añade la contribución `k q / r` de cada carga usando `r = sqrt(dx^2 + dy^2 + dz^2 + ε)`.

- `src/physics/fieldWorker.ts`
  - Este archivo se ejecuta en un Worker para calcular un campo escalar tridimensional de potencial.
  - Preprocesa cada carga a `kq = ke * q` para mejorar el rendimiento.
  - Recorre una malla 3D de resolución dada y evalúa el potencial en cada celda.
  - Los valores de potencial se pasan al algoritmo Marching Cubes para extraer superficies equipotenciales.
  - También calcula niveles de aislamiento adaptativos basados en el valor máximo de carga, produciendo isosuperficies positivas y negativas.

### 5.2. Capa de visualización

- `src/canvas/FieldArrows.tsx`
  - Llama a `calculateElectricField(...)` para determinar la dirección del campo en cada punto de la cuadrícula de flechas.
  - Usa la magnitud del campo para ajustar la longitud y opacidad de las flechas que representan el campo eléctrico.
  - Calcula pasos de trayectoria del campo para mostrar líneas de campo y flechas de dirección.

- `src/canvas/Scene.tsx`
  - Llama de forma directa a `calculateElectricField(...)` y `calculateElectricPotential(...)` para generar datos de visualización en la escena.
  - Usa el valor del campo en puntos de la malla para definir colores y la intensidad de la representación.
  - Controla la renderización de cargas, líneas de campo y superficies con base en los resultados físicos.

Estas implementaciones enlazan la física matemática con la representación visual de la simulación, permitiendo que el proyecto muestre tanto el campo eléctrico como las superficies equipotenciales.
