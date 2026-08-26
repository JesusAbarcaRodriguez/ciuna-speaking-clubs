import { useMemo, useState } from 'react';

type QuestionType = 'short_text' | 'email' | 'select' | 'radio' | 'info';

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
  questions: QuestionRow[];
  initialResponses: ResponseRow[];
  initialAcceptingResponses: boolean;
}

type SubView = 'resumen' | 'pregunta' | 'individual';

function csvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function ResponsesViewer({
  questions,
  initialResponses,
  initialAcceptingResponses,
}: Props) {
  const [responses] = useState(initialResponses);
  const [acceptingResponses, setAcceptingResponses] = useState(initialAcceptingResponses);
  const [toggling, setToggling] = useState(false);
  const [subView, setSubView] = useState<SubView>('resumen');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [responseIndex, setResponseIndex] = useState(0);

  const answerableQuestions = useMemo(() => questions.filter((q) => q.type !== 'info'), [questions]);

  async function handleToggleAccepting() {
    setToggling(true);
    const next = !acceptingResponses;
    const res = await fetch('/api/admin/accepting-responses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acceptingResponses: next }),
    });
    if (res.ok) setAcceptingResponses(next);
    setToggling(false);
  }

  function handleExportExcel() {
    const headers = ['Marca temporal', ...answerableQuestions.map((q) => q.label)];
    const rows = responses.map((r) => {
      const cells = [
        new Date(r.submittedAt).toLocaleString('es-CR'),
        ...answerableQuestions.map((q) => r.answers[q.label] ?? ''),
      ];
      return cells.map(csvCell).join(',');
    });

    // BOM al inicio para que Excel detecte UTF-8 y muestre tildes/ñ correctamente.
    const csv = '﻿' + [headers.map(csvCell).join(','), ...rows].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'respuestas.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
      <AcceptingBanner
        acceptingResponses={acceptingResponses}
        toggling={toggling}
        onToggle={handleToggleAccepting}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{responses.length} respuestas</h2>
          <button
            type="button"
            onClick={handleExportExcel}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
          >
            Exportar a Excel
          </button>
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
