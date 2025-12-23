import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function Page() {
  return (
    <AuthLayout
      title="E-M-C Sales Cockpit"
      subtitle="Setzen Sie Ihr Passwort zurück"
    >
        <ForgotPasswordForm />
    </AuthLayout>
  );
}
