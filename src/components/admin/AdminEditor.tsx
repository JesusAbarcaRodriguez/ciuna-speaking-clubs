import { useState } from 'react';

type QuestionType = 'short_text' | 'email' | 'select' | 'radio' | 'info';

interface QuestionRow {
  id?: number;
  order?: number;
  type: QuestionType;
  label: string;
  placeholder?: string | null;
  required: boolean;
  options?: string[] | null;
  imageKey?: string | null;
}

interface EditableQuestion {
  key: string;
  type: QuestionType;
  label: string;
  placeholder: string;
  required: boolean;
  optionsText: string;
  imageKey: string;
}

interface Props {
  initialMeta: { title: string; description: string };
  initialQuestions: QuestionRow[];
}

const TYPE_LABELS: Record<QuestionType, string> = {
  short_text: 'Texto corto',
  email: 'Correo electrónico',
  select: 'Lista desplegable',
  radio: 'Opción múltiple',
  info: 'Bloque informativo (imagen fija)',
};

let keyCounter = 0;
function nextKey() {
  keyCounter += 1;
  return `q-${keyCounter}`;
}

function toEditable(q: QuestionRow): EditableQuestion {
  return {
    key: nextKey(),
    type: q.type,
    label: q.label,
    placeholder: q.placeholder || '',
    required: q.required,
    optionsText: (q.options || []).join('\n'),
    imageKey: q.imageKey || '',
  };
}

export default function AdminEditor({ initialMeta, initialQuestions }: Props) {
  const [title, setTitle] = useState(initialMeta.title);
  const [description, setDescription] = useState(initialMeta.description);
  const [items, setItems] = useState<EditableQuestion[]>(() => initialQuestions.map(toEditable));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  function updateItem(key: string, patch: Partial<EditableQuestion>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function moveItem(key: string, direction: -1 | 1) {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.key === key);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        key: nextKey(),
        type: 'short_text',
        label: 'Nueva pregunta',
        placeholder: '',
        required: true,
        optionsText: '',
        imageKey: '',
      },
    ]);
  }

  async function handleSave() {
    setStatus('saving');
    setErrorMessage('');

    const payload = {
      meta: { title, description },
      questions: items.map((item) => ({
        type: item.type,
        label: item.label,
        placeholder: item.placeholder || null,
        required: item.required,
        options:
          item.type === 'select' || item.type === 'radio'
            ? item.optionsText
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
            : null,
        imageKey: item.imageKey || null,
      })),
    };

    const res = await fetch('/api/admin/form', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMessage(data.error || 'Error al guardar.');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Título del formulario</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Descripción{' '}
            <span className="text-gray-400">(usa **texto** para negrita)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-brand"
          />
        </div>
      </div>

      {items.map((item, index) => (
        <div key={item.key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-gray-400">
              Pregunta {index + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveItem(item.key, -1)}
                disabled={index === 0}
                className="text-sm px-2 py-1 border border-gray-300 rounded disabled:opacity-30"
                aria-label="Subir"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveItem(item.key, 1)}
                disabled={index === items.length - 1}
                className="text-sm px-2 py-1 border border-gray-300 rounded disabled:opacity-30"
                aria-label="Bajar"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeItem(item.key)}
                className="text-sm px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
              >
                Eliminar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Título de la pregunta</label>
              <input
                value={item.label}
                onChange={(e) => updateItem(item.key, { label: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Tipo</label>
              <select
                value={item.type}
                onChange={(e) => updateItem(item.key, { type: e.target.value as QuestionType })}
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-brand bg-white"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(item.type === 'short_text' || item.type === 'email') && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">Texto de ayuda (placeholder)</label>
              <input
                value={item.placeholder}
                onChange={(e) => updateItem(item.key, { placeholder: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-brand"
              />
            </div>
          )}

          {(item.type === 'select' || item.type === 'radio') && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Opciones <span className="text-gray-400">(una por línea)</span>
              </label>
              <textarea
                value={item.optionsText}
                onChange={(e) => updateItem(item.key, { optionsText: e.target.value })}
                rows={6}
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-brand font-mono text-sm"
              />
            </div>
          )}

          {item.type === 'info' && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">Imagen fija asociada</label>
              <select
                value={item.imageKey}
                onChange={(e) => updateItem(item.key, { imageKey: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-brand bg-white"
              >
                <option value="">Ninguna</option>
                <option value="levels">Diagrama de niveles</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Las imágenes se administran en el código del sitio, no aquí.
              </p>
            </div>
          )}

          {item.type !== 'info' && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={item.required}
                onChange={(e) => updateItem(item.key, { required: e.target.checked })}
                className="w-4 h-4 accent-brand"
              />
              Obligatoria
            </label>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-500 hover:border-brand hover:text-brand transition-colors"
      >
        + Agregar pregunta
      </button>

      <div className="sticky bottom-4 flex items-center justify-between bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="text-sm">
          {status === 'saving' && <span className="text-gray-500">Guardando...</span>}
          {status === 'saved' && <span className="text-green-600">Cambios guardados.</span>}
          {status === 'error' && <span className="text-red-600">{errorMessage}</span>}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'saving'}
          className="bg-brand hover:bg-indigo-600 text-white font-medium rounded-md px-6 py-2 transition-colors disabled:opacity-50"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
