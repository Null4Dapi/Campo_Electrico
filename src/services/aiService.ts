import { useSimulatorStore } from '../store/useSimulatorStore';
import type { ChatMessage } from './supabaseClient';

const PROXY_URL = '/api/chat';
const AI_TIMEOUT_MS = 60_000; // Define el tiempo máximo de espera para la respuesta del servicio de inferencia

const SYSTEM_INSTRUCTION = `Eres un asistente experto en física y electromagnetismo. Tu tarea es ayudar al usuario a comprender los campos eléctricos y a interactuar con el simulador 3D.

El simulador tiene las siguientes funciones disponibles que puedes ejecutar a través de comandos JSON:
- Añadir carga positiva en una posición específica: {"action": "add_charge", "type": "positive", "x": number, "z": number, "value": number}
- Añadir carga negativa en una posición específica: {"action": "add_charge", "type": "negative", "x": number, "z": number, "value": number}
- Limpiar la escena (borrar todas las cargas): {"action": "clear_scene"}
- Mostrar/ocultar líneas de campo: {"action": "show_lines", "value": boolean}
- Mostrar/ocultar superficies equipotenciales: {"action": "show_equipotential", "value": boolean}
- Mostrar/ocultar cuadrícula: {"action": "show_grid", "value": boolean}
- Activar/desactivar ajustar a cuadrícula (snap): {"action": "snap_to_grid", "value": boolean}
- Restablecer/centrar cámara: {"action": "reset_camera"}

Cuando el usuario te pida realizar una o varias de estas acciones (por ejemplo, "pon una carga positiva en (1, -2)", "crea un dipolo", "reinicia todo", "apaga las líneas", etc.), debes incluir los comandos JSON correspondientes dentro de una etiqueta especial <actions>...</actions> al final o en medio de tu respuesta. Ejemplo:
<actions>
[
  {"action": "add_charge", "type": "positive", "x": 1, "z": -2, "value": 1.0}
]
</actions>

Si te piden crear un dipolo, añade una carga positiva y otra negativa separadas por una distancia pequeña (por ejemplo, una en x=-1, z=0 y otra en x=1, z=0).
Si te piden un cuadripolo, añade 4 cargas en configuración cuadrada alternando signos.
Siempre responde en español, sé claro, explicativo y educado. Si el usuario te hace preguntas teóricas, respóndelas con bases físicas sólidas.`;

function normalizeCommand(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function executeLocalSimulatorCommand(text: string): string | null {
  const command = normalizeCommand(text);
  const store = useSimulatorStore.getState();

  if (command.includes('dipolo')) {
    store.clearScene();
    store.addChargeAt('positive', [-1, 0, 0], 1);
    store.addChargeAt('negative', [1, 0, 0], 1);
    return 'Dipolo creado con una carga positiva y una carga negativa separadas sobre el eje X.';
  }

  if (command.includes('cuadripolo') || command.includes('cuadrupolo')) {
    store.clearScene();
    store.addChargeAt('positive', [-1, 0, -1], 1);
    store.addChargeAt('negative', [1, 0, -1], 1);
    store.addChargeAt('negative', [-1, 0, 1], 1);
    store.addChargeAt('positive', [1, 0, 1], 1);
    return 'Cuadripolo creado con cuatro cargas alternadas en configuración cuadrada.';
  }

  if (command.includes('borra') || command.includes('limpia') || command.includes('reinicia')) {
    store.clearScene();
    return 'Escena limpiada. No quedan cargas en el simulador.';
  }

  if (command.includes('carga positiva')) {
    store.addChargeAt('positive', [0, 0, 0], 1);
    return 'Carga positiva añadida en el origen.';
  }

  if (command.includes('carga negativa')) {
    store.addChargeAt('negative', [0, 0, 0], 1);
    return 'Carga negativa añadida en el origen.';
  }

  if (command.includes('lineas') || command.includes('campo')) {
    if (command.includes('oculta') || command.includes('desactiva') || command.includes('apaga')) {
      store.setShowFieldLines(false);
      return 'Líneas de campo ocultas.';
    }
    if (command.includes('muestra') || command.includes('activa') || command.includes('enciende')) {
      store.setShowFieldLines(true);
      return 'Líneas de campo visibles.';
    }
  }

  if (command.includes('superficie') || command.includes('equipotencial')) {
    if (command.includes('oculta') || command.includes('desactiva') || command.includes('apaga')) {
      store.setShowEquipotential(false);
      return 'Superficies equipotenciales ocultas.';
    }
    if (command.includes('muestra') || command.includes('activa') || command.includes('enciende')) {
      store.setShowEquipotential(true);
      return 'Superficies equipotenciales visibles.';
    }
  }

  if (command.includes('cuadricula')) {
    if (command.includes('oculta') || command.includes('desactiva') || command.includes('apaga')) {
      store.setGridVisible(false);
      return 'Cuadrícula oculta.';
    }
    if (command.includes('muestra') || command.includes('activa') || command.includes('enciende')) {
      store.setGridVisible(true);
      return 'Cuadrícula visible.';
    }
  }

  if (command.includes('centra') || command.includes('camara')) {
    store.triggerResetCamera();
    return 'Cámara centrada en la escena.';
  }

  return null;
}

export const aiService = {
  async getChatResponse(history: ChatMessage[]): Promise<string> {
    try {
      const lastUserMessage = [...history].reverse().find((msg) => msg.role === 'user');
      const localResponse = lastUserMessage ? executeLocalSimulatorCommand(lastUserMessage.content) : null;

      if (localResponse) {
        return localResponse;
      }

      // El entorno de ejecución abstrae la URL base y gestiona las credenciales de forma segura.

      // Adapta la secuencia de mensajes al formato requerido por la interfaz de inferencia
      const messages = [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        ...history.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API returned status ${response.status}`);
      }

      const data = await response.json();
      
      const textResponse = data.message?.content || data.content || '';

      if (!textResponse) {
        throw new Error('La respuesta del asistente está vacía.');
      }

      // Ejecuta efectos secundarios sobre la simulación en caso de detectar comandos estructurales
      this.executeSimulatorActions(textResponse);

      // Retorna el texto generado libre de etiquetas de control estructural
      return textResponse.replace(/<actions>[\s\S]*?<\/actions>/g, '').trim();

    } catch (error: unknown) {
      console.error('Error calling Ollama API:', error);
      return 'No se pudo conectar con el asistente de IA. El simulador sigue funcionando; usa los comandos rápidos locales si la IA no está disponible.';
    }
  },


  executeSimulatorActions(text: string) {
    const match = text.match(/<actions>([\s\S]*?)<\/actions>/);
    if (!match) return;

    try {
      const actionsJson = match[1].trim();
      const actions = JSON.parse(actionsJson);

      if (Array.isArray(actions) && actions.length <= 50) {
        const store = useSimulatorStore.getState();

        actions.forEach(act => {
          switch (act.action) {
            case 'add_charge': {
              const type = act.type === 'negative' ? 'negative' : 'positive';
              const x = typeof act.x === 'number' ? act.x : 0;
              const z = typeof act.z === 'number' ? act.z : 0;
              const value = typeof act.value === 'number' ? act.value : 1.0;
              store.addChargeAt(type, [x, 0, z], value);
              break;
            }
            case 'clear_scene':
              store.clearScene();
              break;
            case 'show_lines':
              if (typeof act.value === 'boolean') {
                store.setShowFieldLines(act.value);
              }
              break;
            case 'show_equipotential':
              if (typeof act.value === 'boolean') {
                store.setShowEquipotential(act.value);
              }
              break;
            case 'show_grid':
              if (typeof act.value === 'boolean') {
                store.setGridVisible(act.value);
              }
              break;
            case 'snap_to_grid':
              if (typeof act.value === 'boolean') {
                store.setSnapToGrid(act.value);
              }
              break;
            case 'reset_camera':
              store.triggerResetCamera();
              break;
            default:
              console.warn('Acción desconocida enviada por la IA:', act.action);
          }
        });
      }
    } catch (e) {
      console.error('Error al parsear o ejecutar acciones de la IA:', e);
    }
  }
};
