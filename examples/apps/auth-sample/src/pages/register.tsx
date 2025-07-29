import Link from "next/link";
import { useEffect, useState } from "react";
import { Layout } from "../components/Layouts/Layout";
import { TextField } from "../components/Fields";
import openfort from "../utils/openfortConfig";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { StatusType, Toast } from "../components/Toasts";
import { AuthPlayerResponse, OAuthProvider } from "@openfort/openfort-js";
import { useRouter } from "next/router";
import { getURL } from "../utils/getUrl";
import { Button } from "@/components/ui/button";

type ErrorType = string | null;

function checkPassword(str: string) {
  var re = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  return re.test(str);
}

function RegisterPage() {
  const [show, setShow] = useState(false);
  const [emailConfirmation, setEmailConfirmation] = useState(false);
  const [user, setUser] = useState<AuthPlayerResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const sessionData = await openfort.user.get().catch((error: Error) => {
        console.log("error", error);
      });
      if (sessionData) setUser(sessionData);
    };
    fetchUser();
  }, [openfort]);

  const [status, setStatus] = useState<StatusType>(null);
  const [error, setError] = useState<ErrorType>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const last_name = formData.get("last_name") as string;
    const first_name = formData.get("first_name") as string;

    if (!checkPassword(password)) {
      setError("invalidPassword");
      return;
    } else {
      setError(null);
    }
    // prevent default form submission
    setStatus({
      type: "loading",
      title: "Signing up...",
    });

    const data = await openfort.auth
      .signUpWithEmailPassword({
        email: email,
        password: password,
        options: {
          data: {
            name: first_name + " " + last_name,
          },
        },
      })
      .catch((error) => {
        setStatus({
          type: "error",
          title: "Error signing up",
        });
      });
    if (data && "action" in data && data.action === "verify_email") {
      await openfort.auth.requestEmailVerification({
        email: email,
        redirectUrl: getURL() + "/login",
      });
      localStorage.setItem("email", email);
      setEmailConfirmation(true);
    }
    if (data && "player" in data) {
      setUser(data.player);
    }
    setStatus({
      type: "success",
      title: "Successfully signed up",
    });
  };

  return (
    <Layout sidebar={
      <div className='flex-col space-y-4 p-8'>
        <div className='bg-white text-sm p-3 border-orange-400 border-4 rounded-sm'>
          <p className="font-medium pb-1">
            Explore Openfort
          </p>
          <p className='text-gray-500'>
          Sign in to the demo to access the dev tools.
          </p>
          <Button variant={'outline'} size={'sm'} className="mt-2" asChild>
            <Link href='https://www.openfort.io/docs' target="_blank">
              Explore the Docs
            </Link>
          </Button>
        </div>
      </div>
    }>
      <div className="flex min-h-full overflow-hidden pt-8 sm:py-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6">
          <div className="-mx-4 flex-auto bg-white py-10 px-8 sm:mx-0 sm:flex-none sm:rounded-md sm:p-14 sm:shadow-2xl">
            {emailConfirmation ? (
              <div className="flex rounded border border-green-900 bg-green-200 p-4">
                <CheckCircleIcon className="h-8 w-8 text-green-900" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    Check your email to confirm
                  </h3>
                  <div className="text-xs font-medium text-green-900">
                    {`You've successfully signed up. Please check your email to
                confirm your account before signing in to the Openfort dashboard`}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {" "}
                <div className="relative mb-6">
                  <h1 className="text-left text-2xl font-semibold tracking-tight text-gray-900">
                    {"Sign in to account"}
                  </h1>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="First name"
                      id="first_name"
                      name="first_name"
                      type="text"
                      autoComplete="given-name"
                      required
                    />
                    <TextField
                      label="Last name"
                      id="last_name"
                      name="last_name"
                      type="text"
                      autoComplete="family-name"
                      required
                    />
                    <TextField
                      className="col-span-full"
                      label="Email address"
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                    />
                    <TextField
                      className="col-span-full"
                      label="Password"
                      id="password"
                      name="password"
                      show={show}
                      setShow={setShow}
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                    <p
                      className={`col-span-full text-xs ${
                        error === "invalidPassword"
                          ? "font-medium text-red-500"
                          : "font-normal text-gray-400"
                      }`}
                    >
                      {
                        "Your password must be at least 8 characters including a lowercase letter, an uppercase letter, and a special character (e.g. !@#%&*)."
                      }
                    </p>
                  </div>
                  <Button type="submit" className="mt-8 w-full">
                    Get started today
                  </Button>
                </form>
              </>
            )}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <div>
                  <Button
                    onClick={async () => {
                      const { url } = await openfort.auth.initOAuth({
                        provider: OAuthProvider.GOOGLE,
                        options: {
                          redirectTo: getURL() + "/login",
                        },
                      });
                      window.location.href = url;
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    <span>Continue with Google</span>
                  </Button>
                </div>
                <div>
                  <Button
                    onClick={async () => {
                      const { url } = await openfort.auth.initOAuth({
                        provider: OAuthProvider.TWITTER,
                        options: {
                          redirectTo: getURL() + "/login",
                        },
                      });
                      window.location.href = url;
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    <p>Continue with Twitter</p>
                  </Button>
                </div>
                <div>
                  <Button
                    onClick={async () => {
                      const { url } = await openfort.auth.initOAuth({
                        provider: OAuthProvider.FACEBOOK,
                        options: {
                          redirectTo: getURL() + "/login",
                        },
                      });
                      window.location.href = url;
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    <p>Continue with Facebook</p>
                  </Button>
                </div>
                <div>
                  <Button
                    onClick={() => router.push("/connect-wallet")}
                    className="w-full"
                    variant="outline"
                  >
                    <p>Continue with wallet</p>
                  </Button>
                </div>
              </div>
              <div>
                <p className="mt-4 text-xs font-normal text-zinc-400">
                  By signing up, you accept
                  <Link
                    className="mx-1 text-orange-500 hover:text-zinc-700"
                    href="https://www.openfort.io/terms"
                  >
                    user terms
                  </Link>
                  ,
                  <Link
                    className="mx-1 text-orange-500 hover:text-zinc-700"
                    href="https://www.openfort.io/privacy"
                  >
                    privacy policy
                  </Link>
                  and
                  <Link
                    className="mx-1 text-orange-500 hover:text-zinc-700"
                    href="https://www.openfort.io/developer-terms"
                  >
                    developer terms of use.
                  </Link>
                </p>
              </div>
            </div>
            <p className="my-5 text-left text-sm text-gray-600">
              {"Have an account? "}
              <Link href="/login" className="text-blue-600">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Toast status={status} setStatus={setStatus} />
    </Layout>
  );
}

export default RegisterPage;
