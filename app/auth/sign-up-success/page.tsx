import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Vielen Dank für Ihre Registrierung!
              </CardTitle>
              <CardDescription>Bitte prüfen Sie Ihre E-Mail zur Bestätigung</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sie haben sich erfolgreich für die EMC Sales App registriert. Bitte prüfen Sie Ihre E-Mail, um
                Ihr Konto zu bestätigen, bevor Sie sich anmelden.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
