import { AuthCard } from "@/components/registration/AuthCard";

const LOGO =
  "https://fjasnwkpvcpzwapxxhvy.supabase.co/storage/v1/object/public/logo/logo%2001.png";
// Using celular.jpg for both breakpoints as requested
const BG =
  "https://fjasnwkpvcpzwapxxhvy.supabase.co/storage/v1/object/public/logo/celular.jpg";

const BENEFITS = [
  {
    icon: "🎯",
    title: "Método socrático",
    desc: "O Theo pergunta antes de explicar. Você aprende de verdade, não decora.",
  },
  {
    icon: "📚",
    title: "Plano personalizado",
    desc: "Baseado no seu objetivo, nível e tempo disponível.",
  },
  {
    icon: "🎓",
    title: "476 cursos reais",
    desc: "Conteúdo da plataforma CEFIS integrado ao seu aprendizado.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {/* ─── Background — single image, face centred at top ─────────────── */}
      <div className="fixed inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BG}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-[right_center] md:object-top"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* ─── Page layout ──────────────────────────────────────────────────── */}
      <div className="min-h-screen flex flex-col md:grid md:grid-cols-[1fr_480px]">

        {/* Left / top: hero — starts lower with extra top padding */}
        <div className="flex flex-col items-center text-center
                        pl-8 pr-6 md:px-16 lg:pl-16 pt-[20vh] md:pt-28 pb-10 md:pb-20 text-white">

          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO}
            alt="CEFIS"
            className="h-[52px] md:h-[64px] object-contain mb-8"
          />

          {/* Headline */}
          <h1 className="text-[1.9rem] md:text-[2.6rem] font-bold leading-[1.15] tracking-tight mb-3 max-w-lg">
            Aprenda do seu jeito,
            <br />
            com um tutor que
            <br />
            realmente te conhece
          </h1>

          <p className="text-sm md:text-lg text-white/75 leading-relaxed mb-8 max-w-md">
            O Theo usa inteligência artificial para criar um plano de estudos
            único para você — baseado em quem você é e onde quer chegar.
          </p>

          {/* Benefit list */}
          <div className="flex flex-col gap-3.5 w-full max-w-sm md:max-w-md">
            {BENEFITS.map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 text-base mt-0.5">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold mb-0.5">{title}</p>
                  <p className="text-xs text-white/60 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right / bottom: auth card — slightly right of centre on desktop */}
        <div className="px-5 md:px-10 pb-10 md:py-20 flex items-start md:items-center md:justify-end">
          <div className="w-full max-w-[420px] md:mr-4">
            <AuthCard />
            <p className="text-center text-xs text-white/35 mt-4 tracking-wide">
              Powered by Claude AI · CEFIS · CMI Tecnologia
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
