import { CheckCircle } from "lucide-react"

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = params.email ? decodeURIComponent(params.email) : null;

  return (
    <div className="flex min-h-full w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-xl">
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#0B3C5D] via-[#2F6FA3] to-[#7FB7D8] rounded-2xl opacity-20 blur-sm"></div>

          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#0B3C5D] via-[#2F6FA3] to-[#7FB7D8] rounded-full blur-xl opacity-30 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-[#0B3C5D] via-[#2F6FA3] to-[#7FB7D8] rounded-full p-4">
                  <CheckCircle className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#0B3C5D] via-[#2F6FA3] to-[#7FB7D8] bg-clip-text text-transparent mb-3">
                Vielen Dank für Ihre Registrierung!
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
                Bitte prüfen Sie Ihre E-Mail zur Bestätigung
              </p>
            </div>

            <div className="bg-[#2F6FA3]/10 dark:bg-[#0B3C5D]/20 border border-[#2F6FA3]/30 dark:border-[#2F6FA3]/20 rounded-xl p-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                Wir haben Ihnen eine E-Mail mit einem Bestätigungslink gesendet.
                Bitte klicken Sie auf den Link, um Ihr Konto zu aktivieren.
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                Hinweis
                Auf dieser Seite ist keine weitere Aktion erforderlich.
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                Nächster Schritt
                Nach der Bestätigung werden Sie zur Login-Seite weitergeleitet.
              </p>
              {email && (
                <div className="mt-4 pt-4 border-t border-[#2F6FA3]/30 dark:border-[#2F6FA3]/20">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Bestätigungs-E-Mail gesendet an:
                  </p>
                  <p className="text-sm font-semibold text-[#2F6FA3] dark:text-[#7FB7D8] break-all">
                    {email}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Keine E-Mail erhalten? Überprüfen Sie Ihren Spam-Ordner oder kontaktieren Sie den Support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
