"use client";

import { useState } from "react";
import { RegistrationForm } from "./RegistrationForm";
import { LoginForm } from "./LoginForm";

type Mode = "register" | "login";

export function AuthCard() {
  const [mode, setMode] = useState<Mode>("register");

  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-6">
      {/* Tab buttons */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            mode === "register"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Criar conta
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            mode === "login"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Já tenho conta
        </button>
      </div>

      {mode === "register" ? (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Criar sua conta
          </h2>
          <p className="text-sm text-gray-400 mb-6">Gratuito e sem cartão de crédito</p>
          <RegistrationForm />
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Bem-vindo de volta
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Entre com o e-mail que você cadastrou
          </p>
          <LoginForm />
        </>
      )}
    </div>
  );
}
