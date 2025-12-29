import { LoginForm } from "@/components/login-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function Page() {
  return (
    <AuthLayout
      title="E-M-C Sales Cockpit"
      subtitle="Melden Sie sich in Ihrem Konto an"
    >
        <LoginForm />
    </AuthLayout>
  //   <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
  //     <div className="w-full max-w-sm">
  //       <LoginForm />
  //     </div>
  //   </div>
  );
}
