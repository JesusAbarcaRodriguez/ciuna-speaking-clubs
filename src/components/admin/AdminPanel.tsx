import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import AdminEditor from './AdminEditor';
import ResponsesViewer from './ResponsesViewer';

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

interface ResponseRow {
  id: number;
  submittedAt: string;
  answers: Record<string, string>;
}

interface Props {
  initialMeta: { title: string; description: string; acceptingResponses: boolean };
  initialQuestions: QuestionRow[];
  initialResponses: ResponseRow[];
  publicUrl: string;
  logoUrl: string;
}

type Tab = 'preguntas' | 'respuestas';

export default function AdminPanel({
  initialMeta,
  initialQuestions,
  initialResponses,
  publicUrl,
  logoUrl,
}: Props) {
  const [tab, setTab] = useState<Tab>('preguntas');

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Enlace copiado.');
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  return (
    <div className="space-y-4">
      <Toaster richColors position="top-right" />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="CI-UNA" className="w-10 h-10 rounded-full" />
          <h1 className="text-xl font-semibold text-gray-800">Panel de administración</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-brand hover:underline"
          >
            Ver formulario público
          </a>
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
          >
            Copiar enlace
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('preguntas')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            tab === 'preguntas' ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Preguntas
        </button>
        <button
          type="button"
          onClick={() => setTab('respuestas')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            tab === 'respuestas' ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Respuestas ({initialResponses.length})
        </button>
      </div>

      {tab === 'preguntas' && (
        <AdminEditor initialMeta={initialMeta} initialQuestions={initialQuestions} />
      )}
      {tab === 'respuestas' && (
        <ResponsesViewer
          questions={initialQuestions}
          initialResponses={initialResponses}
          initialAcceptingResponses={initialMeta.acceptingResponses}
        />
      )}
    </div>
  );
}
