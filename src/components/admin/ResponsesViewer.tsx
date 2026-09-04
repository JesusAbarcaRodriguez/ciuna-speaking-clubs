import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfirmDialog } from '../../lib/useConfirmDialog';
import ConfirmDialog from './ConfirmDialog';

type QuestionType = 'short_text' | 'text_only' | 'numeric' | 'email' | 'select' | 'radio' | 'info';

interface QuestionRow {
  id?: number;
  type: QuestionType;
  label: string;
  options?: string[] | null;
}

interface ResponseRow {
  id: number;
  submittedAt: string;
  answers: Record<string, string>;
}

interface Props {
  formSlug: string;
  questions: QuestionRow[];
  initialResponses: ResponseRow[];
  initialAcceptingResponses: boolean;
}

type SubView = 'resumen' | 'pregunta' | 'individual';

export default function ResponsesViewer({
  formSlug,
  questions,
  initialResponses,
  initialAcceptingResponses,
}: Props) {
  const [responses, setResponses] = useState(initialResponses);
  const [acceptingResponses, setAcceptingResponses] = useState(initialAcceptingResponses);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [subView, setSubView] = useState<SubView>('resumen');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [responseIndex, setResponseIndex] = useState(0);
  const { dialogProps, requestConfirm } = useConfirmDialog();

  const answerableQuestions = useMemo(() => questions.filter((q) => q.type !== 'info'), [questions]);

  // La pregunta de tipo "radio" es, por convención de este proyecto, la
  // pregunta de club/horario (ver sql/006_scope_triggers_to_form.sql).
  const clubQuestion = useMemo(() => questions.find((q) => q.type === 'radio') ?? null, [questions]);

  const clubCounts = useMemo(() => {
    if (!clubQuestion) return [];
    const counts = new Map<string, number>();
    for (const opt of clubQuestion.options || []) counts.set(opt, 0);
    for (const r of responses) {
      const val = r.answers[clubQuestion.label];
      if (val === undefined || val === '') continue;
      counts.set(val, (counts.get(val) || 0) + 1);
    }
    return [...counts.entries()];
  }, [clubQuestion, responses]);

  async function handleToggleAccepting() {
    setToggling(true);
    const next = !acceptingResponses;
    const res = await fetch(`/api/admin/${formSlug}/accepting-responses`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acceptingResponses: next }),
    });
    if (res.ok) {
      setAcceptingResponses(next);
      toast.success(next ? 'El formulario ya acepta respuestas.' : 'El formulario dejó de aceptar respuestas.');
    } else {
      toast.error('No se pudo actualizar el estado del formulario.');
    }
    setToggling(false);
  }

  function handleExportExcel() {
    const a = document.createElement('a');
    a.href = `/api/admin/${formSlug}/export`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('Archivo descargado.');
  }

  function handleExportByClub(club: string) {
    const a = document.createElement('a');
    a.href = `/api/admin/${formSlug}/export?club=${encodeURIComponent(club)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('Archivo descargado.');
  }

  function handleExportGroupedByClub() {
    const a = document.createElement('a');
    a.href = `/api/admin/${formSlug}/export?groupBy=club`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('Archivo descargado.');
  }

  function handleDeleteAll() {
    requestConfirm(
      `¿Eliminar las ${responses.length} respuestas? Esta acción no se puede deshacer.`,
      async () => {
        setDeleting(true);
        const res = await fetch(`/api/admin/${formSlug}/responses`, { method: 'DELETE' });
        if (res.ok) {
          setResponses([]);
          setQuestionIndex(0);
          setResponseIndex(0);
          toast.success('Respuestas eliminadas.');
        } else {
          toast.error('No se pudieron eliminar las respuestas.');
        }
        setDeleting(false);
      },
    );
  }

  if (responses.length === 0) {
    return (
      <div className="space-y-4">
        <AcceptingBanner
          acceptingResponses={acceptingResponses}
          toggling={toggling}
          onToggle={handleToggleAccepting}
        />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Todavía no hay respuestas.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog {...dialogProps} />
      <AcceptingBanner
        acceptingResponses={acceptingResponses}
        toggling={toggling}
        onToggle={handleToggleAccepting}
      />

      {clubQuestion && (
        <ExportByClub
          question={clubQuestion}
          counts={clubCounts}
          onExportAll={handleExportGroupedByClub}
          onExportOne={handleExportByClub}
        />
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{responses.length} respuestas</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
            >
              Exportar a Excel
            </button>
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={deleting}
              className="text-sm border border-red-200 text-red-600 rounded-md px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Eliminar todas'}
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-gray-200">
          {(['resumen', 'pregunta', 'individual'] as SubView[]).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setSubView(view)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${
                subView === view
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {subView === 'resumen' && (
        <div className="space-y-4">
          {answerableQuestions.map((q) => (
            <SummaryQuestion key={q.label} question={q} responses={responses} />
          ))}
        </div>
      )}

      {subView === 'pregunta' && answerableQuestions.length > 0 && (
        <QuestionNavigator
          question={answerableQuestions[questionIndex]}
          index={questionIndex}
          total={answerableQuestions.length}
          responses={responses}
          onPrev={() => setQuestionIndex((i) => Math.max(0, i - 1))}
          onNext={() => setQuestionIndex((i) => Math.min(answerableQuestions.length - 1, i + 1))}
        />
      )}

      {subView === 'individual' && (
        <ResponseNavigator
          response={responses[responseIndex]}
          index={responseIndex}
          total={responses.length}
          questions={answerableQuestions}
          onPrev={() => setResponseIndex((i) => Math.max(0, i - 1))}
          onNext={() => setResponseIndex((i) => Math.min(responses.length - 1, i + 1))}
        />
      )}
    </div>
  );
}

function AcceptingBanner({
  acceptingResponses,
  toggling,
  onToggle,
}: {
  acceptingResponses: boolean;
  toggling: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-lg border p-4 flex flex-wrap items-center justify-between gap-3 ${
        acceptingResponses ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
      }`}
    >
      <p className="text-sm text-gray-700">
        {acceptingResponses ? 'Este formulario está aceptando respuestas.' : 'Este formulario no acepta respuestas.'}
      </p>
      <button
        type="button"
        onClick={onToggle}
        disabled={toggling}
        className="text-sm border border-gray-300 bg-white rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
      >
        {acceptingResponses ? 'Dejar de aceptar respuestas' : 'Aceptar respuestas'}
      </button>
    </div>
  );
}

function ExportByClub({
  question,
  counts,
  onExportAll,
  onExportOne,
}: {
  question: QuestionRow;
  counts: [string, number][];
  onExportAll: () => void;
  onExportOne: (club: string) => void;
}) {
  const totalWithClub = counts.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold text-gray-800">Exportar por club</h2>
        <button
          type="button"
          onClick={onExportAll}
          disabled={totalWithClub === 0}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
        >
          Descargar todos los clubs (una pestaña por club)
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Un excel independiente por cada opción de "{question.label}".
      </p>
      {counts.length === 0 ? (
        <p className="text-sm text-gray-500">Esta pregunta todavía no tiene opciones configuradas.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-md">
          {counts.map(([club, count]) => (
            <div key={club} className="flex items-center justify-between gap-3 py-2 px-3 text-sm">
              <span className="text-gray-700">{club}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-gray-400">{count}</span>
                <button
                  type="button"
                  onClick={() => onExportOne(club)}
                  disabled={count === 0}
                  className="text-xs border border-gray-300 rounded-md px-2 py-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryQuestion({ question, responses }: { question: QuestionRow; responses: ResponseRow[] }) {
  const answers = responses.map((r) => r.answers[question.label]).filter((v) => v !== undefined && v !== '');

  if (question.type === 'select' || question.type === 'radio') {
    const counts = new Map<string, number>();
    for (const opt of question.options || []) counts.set(opt, 0);
    for (const a of answers) counts.set(a, (counts.get(a) || 0) + 1);
    const max = Math.max(1, ...counts.values());

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="font-semibold text-gray-800 mb-4">{question.label}</p>
        <div className="space-y-2">
          {[...counts.entries()].map(([opt, count]) => (
            <div key={opt} className="text-sm">
              <div className="flex justify-between text-gray-700 mb-1">
                <span>{opt}</span>
                <span className="text-gray-400">{count}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded">
                <div
                  className="h-2 bg-brand rounded"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="font-semibold text-gray-800 mb-4">
        {question.label} <span className="text-gray-400 font-normal">({answers.length} respuestas)</span>
      </p>
      <ul className="space-y-1 max-h-64 overflow-y-auto text-sm text-gray-700 divide-y divide-gray-100">
        {answers.map((a, i) => (
          <li key={i} className="py-1.5">{a}</li>
        ))}
      </ul>
    </div>
  );
}

function QuestionNavigator({
  question,
  index,
  total,
  responses,
  onPrev,
  onNext,
}: {
  question: QuestionRow;
  index: number;
  total: number;
  responses: ResponseRow[];
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-gray-800">{question.label}</p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            type="button"
            onClick={onPrev}
            disabled={index === 0}
            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-30"
          >
            ←
          </button>
          <span>
            {index + 1} de {total}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={index === total - 1}
            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>
      <ul className="space-y-1 max-h-96 overflow-y-auto text-sm text-gray-700 divide-y divide-gray-100">
        {responses.map((r) => (
          <li key={r.id} className="py-1.5">{r.answers[question.label] || '—'}</li>
        ))}
      </ul>
    </div>
  );
}

function ResponseNavigator({
  response,
  index,
  total,
  questions,
  onPrev,
  onNext,
}: {
  response: ResponseRow;
  index: number;
  total: number;
  questions: QuestionRow[];
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {new Date(response.submittedAt).toLocaleString('es-CR')}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            type="button"
            onClick={onPrev}
            disabled={index === 0}
            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-30"
          >
            ←
          </button>
          <span>
            {index + 1} de {total}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={index === total - 1}
            className="px-2 py-1 border border-gray-300 rounded disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.label}>
            <p className="text-sm text-gray-500">{q.label}</p>
            <p className="text-gray-800">{response.answers[q.label] || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
