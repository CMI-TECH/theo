"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
}

const STEPS = [
  {
    icon: "🧠",
    title: "Bem-vindo ao Theo!",
    body: "O Theo é seu tutor socrático pessoal. Ele nunca despeja conteúdo direto — primeiro faz perguntas para entender o que você já sabe, depois ensina exatamente o que falta.",
  },
  {
    icon: "🗺️",
    title: "Seu mapa de conhecimento",
    body: "Na lateral você verá seu mapa de tópicos se construindo em tempo real. Verde = domínio sólido, amarelo = em progresso, vermelho = área a desenvolver.",
  },
  {
    icon: "🎯",
    title: "Como aproveitar melhor",
    body: "O Theo vai te fazer algumas perguntas para criar um plano de estudos personalizado. Seja honesto nas respostas — quanto mais contexto você der, mais preciso ele fica.",
  },
];

export function WelcomeModal({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl mb-5">
          {current.icon}
        </div>

        {/* Content */}
        <h2 className="text-lg font-bold text-gray-900 mb-3">{current.title}</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">{current.body}</p>

        {/* Step dots */}
        <div className="flex gap-1.5 mb-7">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === step
                  ? "w-5 h-2 bg-blue-600"
                  : "w-2 h-2 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => {
            if (isLast) {
              onClose();
            } else {
              setStep((s) => s + 1);
            }
          }}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-2xl transition-all duration-200 shadow-sm"
        >
          {isLast ? "Vamos lá!" : "Próximo"}
        </button>

        {!isLast && (
          <button
            type="button"
            onClick={onClose}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Pular tutorial
          </button>
        )}
      </div>
    </div>
  );
}
