import { UpdatePasswordForm } from "@/components/update-password-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function Page() {
  return (
    <AuthLayout
      title="E-M-C Sales Cockpit"
      subtitle="Aktualisieren Sie Ihr Passwort"
    >
        <UpdatePasswordForm />
    </AuthLayout>
  );
}
