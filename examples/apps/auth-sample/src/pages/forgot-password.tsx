import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Layout } from "../components/Layouts/Layout";
import { TextField } from "../components/Fields";
import { StatusType, Toast } from "../components/Toasts";
import openfort from "../utils/openfortConfig";
import { getURL } from "../utils/getUrl";
import { AuthPlayerResponse } from "@openfort/openfort-js";
import { Button } from "@/components/ui/button";

function ForgotPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusType>(null);

  const [user, setUser] = useState<AuthPlayerResponse | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.getUser().catch((error: Error) => {
        console.log("error", error);
      });
      if (sessionData) setUser(sessionData);
    };
    fetchUser();
  }, [openfort]);

  useEffect(() => {
    async function loadData() {
      router.push("/dashboard");
    }

    if (user) loadData();
  }, [user, openfort]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setStatus({
      type: "loading",
      title: "Sending password reset email...",
    });

    const formData = new FormData(event.currentTarget);

    const email = formData.get("email") as string;

    event.preventDefault();
    localStorage.setItem("openfort:email", email);
    await openfort
      .requestResetPassword({
        email: email,
        redirectUrl: getURL() + "/reset-password",
      })
      .catch((error) => {
        setStatus({
          type: "error",
          title: "Error sending email",
        });
      });

    setStatus({
      type: "success",
      title: "Successfully sent email",
    });
  };

  return (
    <Layout sidebar={<div />}>
      <div className="flex min-h-full overflow-hidden pt-8 sm:py-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
          <div className="-mx-4 flex-auto bg-white py-10 px-8 sm:mx-0 sm:flex-none sm:rounded-md sm:p-14 sm:shadow-2xl">
            <div className="relative mb-6">
              <h1 className="text-left text-2xl font-semibold tracking-tight text-gray-900">
                {"Reset Your Password"}
              </h1>
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <TextField
                    label="Email address"
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </div>
                <Button type="submit" className="mt-8 w-full py-2">
                  Send Reset Email
                </Button>
              </form>
              <p className="my-5 text-left text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600">
                 login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Toast status={status} setStatus={setStatus} />
    </Layout>
  );
}

export default ForgotPasswordPage;
