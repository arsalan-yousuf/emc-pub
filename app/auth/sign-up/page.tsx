import { SignUpForm } from "@/components/sign-up-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function Page() {
  return (
    <AuthLayout
      title="E-M-C Sales Cockpit"
      subtitle="Erstellen Sie Ihr Konto"
    >
        <SignUpForm />
    </AuthLayout>
  );
}
